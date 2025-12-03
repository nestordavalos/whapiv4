/**
 * WhatsApp Web.js Client Manager - Versión Mejorada
 *
 * Este módulo gestiona las conexiones de WhatsApp con:
 * - Circuit Breaker para prevenir fallos en cascada
 * - Health Check continuo
 * - Reconexión inteligente con backoff exponencial
 * - Mejor manejo de errores de la librería
 * - Compatibilidad con actualizaciones de whatsapp-web.js
 */

import * as Sentry from "@sentry/node";
import qrCode from "qrcode-terminal";
import { Client, LocalAuth } from "whatsapp-web.js";
import { Op } from "sequelize";
import fs from "fs/promises";
import path from "path";
import { getIO } from "./socket";
import Whatsapp from "../models/Whatsapp";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";
import {
  handleMsgAck,
  handleMessage
} from "../services/WbotServices/wbotMessageListener";
import Message from "../models/Message";
import { getWhatsAppConfig } from "../config/whatsapp";
import {
  getCircuitBreaker,
  removeCircuitBreaker
} from "./WhatsAppCircuitBreaker";
import { healthChecker } from "./WhatsAppHealthChecker";
import { reconnectService } from "./WhatsAppReconnectService";

// Extendemos la interfaz Client para nuestras propiedades adicionales
interface Session extends Client {
  id?: number;
  pingInterval?: NodeJS.Timeout;
  lastHealthCheck?: Date;
  consecutiveFailedChecks?: number;
  healthCheckActive?: boolean;
  initializationTimeout?: NodeJS.Timeout;
}

// Almacén global de sesiones
const sessions: Session[] = [];

/**
 * Verifica si la librería está en una versión compatible
 */
const checkLibraryCompatibility = (): void => {
  try {
    // Verificar que los módulos críticos existen
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const pkg = require("whatsapp-web.js/package.json");
    logger.info(`[wbot] whatsapp-web.js versión: ${pkg.version}`);

    // Verificar módulos internos críticos
    const criticalModules = ["whatsapp-web.js/src/util/Injected/Utils"];

    criticalModules.forEach(mod => {
      try {
        // eslint-disable-next-line global-require, import/no-dynamic-require
        require(mod);
      } catch {
        logger.warn(
          `[wbot] Módulo interno no encontrado: ${mod}. Posible cambio de estructura en nueva versión.`
        );
      }
    });
  } catch (err) {
    logger.warn("[wbot] No se pudo verificar versión de whatsapp-web.js");
  }
};

/**
 * Sincroniza mensajes no leídos de forma segura
 */
const syncUnreadMessages = async (wbot: Session): Promise<void> => {
  try {
    const chats = await wbot.getChats();

    for (const chat of chats) {
      if (chat.unreadCount > 0) {
        try {
          const unreadMessages = await chat.fetchMessages({
            limit: chat.unreadCount
          });

          const ids = unreadMessages.map(msg => msg.id.id);
          const existing = await Message.findAll({
            where: { id: { [Op.in]: ids } },
            attributes: ["id"],
            raw: true
          });
          const existingIds = new Set(existing.map(m => m.id));
          const newMessages = unreadMessages
            .filter(msg => !existingIds.has(msg.id.id))
            .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

          for (const msg of newMessages) {
            try {
              if (!msg.body) msg.body = "";
              await handleMessage(msg, wbot);
            } catch (err: unknown) {
              const error = err as { name?: string };
              if (error?.name === "SequelizeUniqueConstraintError") {
                logger.debug(`[wbot] Mensaje duplicado ignorado: ${msg.id.id}`);
                // eslint-disable-next-line no-continue
                continue;
              }
              Sentry.captureException(err);
              logger.error(`[wbot] Error procesando mensaje no leído: ${err}`);
            }
          }

          // Marcar como visto con manejo de errores robusto
          await markChatAsSeen(wbot, chat);
        } catch (chatErr) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-underscore-dangle
          const chatId = (chat.id as any)?._serialized || chat.id;
          logger.warn(`[wbot] Error procesando chat ${chatId}: ${chatErr}`);
        }
      }
    }
  } catch (err) {
    logger.error(`[wbot] Error en syncUnreadMessages: ${err}`);
    Sentry.captureException(err);
  }
};

/**
 * Marca un chat como visto de forma segura
 */
const markChatAsSeen = async (
  wbot: Session,
  chat: Awaited<ReturnType<Client["getChats"]>>[0]
): Promise<void> => {
  const maxRetries = 2;
  let retries = 0;

  while (retries <= maxRetries) {
    try {
      // Verificar si sendSeen está disponible
      type WWebJSWindow = { WWebJS?: { sendSeen?: () => void } };
      const isSendSeenAvailable = await wbot.pupPage?.evaluate(
        () =>
          typeof (window as unknown as WWebJSWindow).WWebJS?.sendSeen ===
          "function"
      );

      if (!isSendSeenAvailable) {
        logger.debug("[wbot] sendSeen no disponible, intentando reinyectar...");
        await reinjectUtils(wbot);
      }

      await chat.sendSeen();
      return;
    } catch (err: unknown) {
      const error = err as { message?: string };
      retries += 1;

      if (error.message?.includes("Execution context was destroyed")) {
        logger.warn(
          `[wbot] Contexto destruido al marcar visto, reintento ${retries}/${maxRetries}`
        );
        await reinjectUtils(wbot);
      } else if (retries > maxRetries) {
        logger.warn(`[wbot] No se pudo marcar como visto: ${error.message}`);
        return;
      }
    }
  }
};

/**
 * Reinyecta utilities de whatsapp-web.js de forma segura
 */
const reinjectUtils = async (wbot: Session): Promise<boolean> => {
  try {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const utils = require("whatsapp-web.js/src/util/Injected/Utils");
    await wbot.pupPage?.evaluate(utils.LoadUtils);
    return true;
  } catch (err) {
    logger.error(`[wbot] Error reinyectando Utils: ${err}`);
    return false;
  }
};

/**
 * Obtiene configuración de Puppeteer según el entorno
 */
const getPuppeteerConfig = () => {
  const config = getWhatsAppConfig();
  const executablePath = process.env.CHROME_BIN || undefined;

  return {
    headless: config.puppeteer.headless,
    devtools: false,
    timeout: config.puppeteer.timeout,
    args: config.puppeteer.args,
    ignoreDefaultArgs: ["--disable-automation"],
    executablePath
  };
};

/**
 * Inicializa un cliente WhatsApp con todas las protecciones
 */
export const initWbot = (whatsapp: Whatsapp): Promise<Session> => {
  return new Promise((resolve, reject) => {
    const config = getWhatsAppConfig();
    const circuitBreaker = getCircuitBreaker(whatsapp.id);

    // Verificar circuit breaker
    if (!circuitBreaker.canAttempt()) {
      const status = circuitBreaker.getStatus();
      const recoveryTime = Math.round((status.timeUntilRecovery || 0) / 1000);
      const error = new AppError(
        `Circuit breaker abierto para WhatsApp ${whatsapp.id}. ` +
          `Recuperación en ${recoveryTime}s`,
        429
      );
      logger.warn(`[wbot:${whatsapp.id}] ${error.message}`);
      reject(error);
      return;
    }

    // Verificar compatibilidad de librería al iniciar
    checkLibraryCompatibility();

    const io = getIO();
    const sessionName = whatsapp.name;
    let sessionCfg;

    if (whatsapp && whatsapp.session) {
      try {
        sessionCfg = JSON.parse(whatsapp.session);
      } catch {
        logger.warn(`[wbot:${whatsapp.id}] Sesión inválida, ignorando`);
      }
    }

    logger.info(`[wbot:${whatsapp.id}] Iniciando cliente ${sessionName}...`);

    const wbot: Session = new Client({
      session: sessionCfg,
      authStrategy: new LocalAuth({ clientId: `bd_${whatsapp.id}` }),
      restartOnAuthFail: false,
      puppeteer: getPuppeteerConfig()
    });

    // Timeout de inicialización
    const initializationTimeout = setTimeout(() => {
      const error = new Error(
        `Timeout de inicialización (${config.initializationTimeoutMs}ms)`
      );
      logger.error(`[wbot:${whatsapp.id}] ${error.message}`);
      circuitBreaker.recordFailure(error);

      try {
        wbot.destroy();
      } catch {
        // Ignorar error de destroy
      }

      reject(error);
    }, config.initializationTimeoutMs);

    wbot.initializationTimeout = initializationTimeout;

    // Evento: QR Code generado
    wbot.on("qr", async qr => {
      try {
        clearTimeout(initializationTimeout);
        logger.info(`[wbot:${whatsapp.id}] QR generado para ${sessionName}`);
        qrCode.generate(qr, { small: true });

        await whatsapp.update({ qrcode: qr, status: "qrcode", retries: 0 });

        if (!sessions.some(s => s.id === whatsapp.id)) {
          wbot.id = whatsapp.id;
          sessions.push(wbot);
        }

        io.emit("whatsappSession", { action: "update", session: whatsapp });

        // Nuevo timeout para escaneo de QR
        wbot.initializationTimeout = setTimeout(() => {
          logger.warn(`[wbot:${whatsapp.id}] Timeout esperando escaneo de QR`);
        }, config.qrCodeTimeoutMs);
      } catch (err) {
        Sentry.captureException(err);
        logger.error(`[wbot:${whatsapp.id}] Error en evento qr: ${err}`);
      }
    });

    // Evento: Autenticación exitosa
    wbot.on("authenticated", async () => {
      try {
        clearTimeout(wbot.initializationTimeout);
        logger.info(`[wbot:${whatsapp.id}] ${sessionName} AUTENTICADO`);
      } catch (err) {
        Sentry.captureException(err);
        logger.error(
          `[wbot:${whatsapp.id}] Error en evento authenticated: ${err}`
        );
      }
    });

    // Evento: Fallo de autenticación
    wbot.on("auth_failure", async msg => {
      try {
        clearTimeout(wbot.initializationTimeout);
        const errorMsg = `AUTH FAILURE: ${msg}`;
        logger.error(`[wbot:${whatsapp.id}] ${sessionName} ${errorMsg}`);

        circuitBreaker.recordFailure(errorMsg);

        if (whatsapp.retries > 1 && config.sessionCleanupOnAuthFail) {
          await whatsapp.update({ session: "", retries: 0 });
          logger.info(`[wbot:${whatsapp.id}] Sesión limpiada por auth_failure`);
        }

        await whatsapp.update({
          status: "DISCONNECTED",
          retries: whatsapp.retries + 1
        });

        io.emit("whatsappSession", { action: "update", session: whatsapp });
        reject(new Error(errorMsg));
      } catch (err) {
        Sentry.captureException(err);
        logger.error(
          `[wbot:${whatsapp.id}] Error en evento auth_failure: ${err}`
        );
        reject(err);
      }
    });

    // Evento: Cliente listo
    wbot.on("ready", async () => {
      try {
        clearTimeout(wbot.initializationTimeout);
        logger.info(`[wbot:${whatsapp.id}] ${sessionName} LISTO`);

        // Registrar éxito en circuit breaker
        circuitBreaker.recordSuccess();

        // Obtener número de forma segura
        let phoneNumber = "";
        try {
          // eslint-disable-next-line no-underscore-dangle
          if (wbot.info?.wid?._serialized) {
            // eslint-disable-next-line no-underscore-dangle
            [phoneNumber] = wbot.info.wid._serialized.split("@");
          }
        } catch {
          logger.warn(
            `[wbot:${whatsapp.id}] No se pudo obtener número de teléfono`
          );
        }

        await whatsapp.update({
          status: "CONNECTED",
          qrcode: "",
          retries: 0,
          number: phoneNumber
        });

        io.emit("whatsappSession", { action: "update", session: whatsapp });

        if (!sessions.some(s => s.id === whatsapp.id)) {
          wbot.id = whatsapp.id;
          sessions.push(wbot);
        }

        // Enviar presencia de forma segura
        try {
          await wbot.sendPresenceAvailable();
        } catch {
          logger.debug(
            `[wbot:${whatsapp.id}] No se pudo enviar presencia disponible`
          );
        }

        // Sincronizar mensajes no leídos
        await syncUnreadMessages(wbot);

        // Iniciar health check
        healthChecker.startMonitoring(wbot, whatsapp, result => {
          logger.error(
            `[wbot:${whatsapp.id}] Health check crítico fallido: ${result.error}`
          );

          // Intentar reconexión automática
          reconnectService.scheduleReconnect(
            whatsapp,
            async () => {
              const session = await restartWbot(whatsapp.id);
              if (!session) {
                throw new Error("Fallo al reiniciar sesión");
              }
            },
            `Health check fallido: ${result.error}`
          );
        });

        // Resetear estado de reconexión
        reconnectService.resetState(whatsapp.id);

        resolve(wbot);
      } catch (err) {
        Sentry.captureException(err);
        logger.error(`[wbot:${whatsapp.id}] Error en evento ready: ${err}`);
        reject(err);
      }
    });

    // Evento: Mensaje recibido
    wbot.on("message", async msg => {
      try {
        await handleMessage(msg, wbot);
      } catch (err) {
        Sentry.captureException(err);
        logger.error(`[wbot:${whatsapp.id}] Error procesando mensaje: ${err}`);
      }
    });

    // Evento: ACK de mensaje
    wbot.on("message_ack", async (msg, ack) => {
      try {
        await handleMsgAck(msg, ack, wbot);
      } catch (err) {
        Sentry.captureException(err);
        logger.error(`[wbot:${whatsapp.id}] Error en message_ack: ${err}`);
      }
    });

    // Evento: Desconexión
    wbot.on("disconnected", async reason => {
      try {
        logger.warn(
          `[wbot:${whatsapp.id}] ${sessionName} DESCONECTADO - ${reason}`
        );

        // Detener health check
        healthChecker.stopMonitoring(wbot);

        await whatsapp.update({ status: "DISCONNECTED" });
        io.emit("whatsappSession", { action: "update", session: whatsapp });

        // Registrar fallo
        circuitBreaker.recordFailure(`Desconectado: ${reason}`);

        // Programar reconexión si está habilitada y no es logout manual
        if (config.reconnectOnDisconnect && reason !== "LOGOUT") {
          reconnectService.scheduleReconnect(
            whatsapp,
            async () => {
              await restartWbot(whatsapp.id);
            },
            reason
          );
        }
      } catch (err) {
        Sentry.captureException(err);
        logger.error(
          `[wbot:${whatsapp.id}] Error en evento disconnected: ${err}`
        );
      }
    });

    // Evento: Pantalla de carga (útil para detectar problemas)
    wbot.on("loading_screen", (percent, message) => {
      logger.debug(`[wbot:${whatsapp.id}] Cargando: ${percent}% - ${message}`);
    });

    // Evento: Cambio de estado
    wbot.on("change_state", state => {
      logger.debug(`[wbot:${whatsapp.id}] Estado cambiado a: ${state}`);
    });

    // Inicializar cliente
    wbot
      .initialize()
      .then(() => {
        logger.debug(`[wbot:${whatsapp.id}] initialize() completado`);
      })
      .catch(err => {
        clearTimeout(initializationTimeout);
        Sentry.captureException(err);
        logger.error(
          `[wbot:${whatsapp.id}] Error en initialize(): ${err.message}`
        );
        circuitBreaker.recordFailure(err);
        reject(err);
      });
  });
};

/**
 * Obtiene una sesión activa por ID
 */
export const getWbot = (whatsappId: number): Session => {
  const session = sessions.find(s => s.id === whatsappId);
  if (!session) {
    throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  }
  return session;
};

/**
 * Verifica si existe una sesión activa
 */
export const hasWbot = (whatsappId: number): boolean => {
  return sessions.some(s => s.id === whatsappId);
};

/**
 * Elimina una sesión
 */
export const removeWbot = (whatsappId: number): void => {
  const index = sessions.findIndex(s => s.id === whatsappId);
  if (index !== -1) {
    const session = sessions[index];

    // Detener health check
    healthChecker.stopMonitoring(session);
    healthChecker.clearHistory(whatsappId);

    // Cancelar reconexiones pendientes
    reconnectService.cancelReconnect(whatsappId);

    // Limpiar timeouts
    if (session.initializationTimeout) {
      clearTimeout(session.initializationTimeout);
    }

    try {
      session.destroy();
    } catch (err) {
      logger.warn(`[wbot:${whatsappId}] Error al destruir sesión: ${err}`);
    }

    sessions.splice(index, 1);

    // Limpiar circuit breaker
    removeCircuitBreaker(whatsappId);

    logger.info(`[wbot:${whatsappId}] Sesión removida`);
  }
};

/**
 * Reinicia una sesión de WhatsApp
 */
export const restartWbot = async (whatsappId: number): Promise<Session> => {
  logger.info(`[wbot:${whatsappId}] Reiniciando sesión...`);

  const whatsapp = await Whatsapp.findByPk(whatsappId);
  if (!whatsapp) {
    throw new AppError("WhatsApp not found.");
  }

  // Remover sesión existente si existe
  if (hasWbot(whatsappId)) {
    removeWbot(whatsappId);
  }

  // Esperar antes de reiniciar
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Iniciar nueva sesión
  const newSession = await initWbot(whatsapp);

  logger.info(`[wbot:${whatsappId}] Sesión reiniciada exitosamente`);
  return newSession;
};

/**
 * Apaga una sesión y limpia archivos de sesión
 */
export const shutdownWbot = async (whatsappId: string): Promise<void> => {
  const whatsappIDNumber = parseInt(whatsappId, 10);

  if (Number.isNaN(whatsappIDNumber)) {
    throw new AppError("Invalid WhatsApp ID format.");
  }

  const whatsapp = await Whatsapp.findByPk(whatsappIDNumber);
  if (!whatsapp) {
    throw new AppError("WhatsApp not found.");
  }

  const sessionPath = path.resolve(
    __dirname,
    `../../.wwebjs_auth/session-bd_${whatsappIDNumber}`
  );

  try {
    logger.info(`[wbot:${whatsappIDNumber}] Apagando sesión...`);

    // Remover sesión activa
    removeWbot(whatsappIDNumber);

    // Limpiar archivos de sesión
    try {
      await fs.rm(sessionPath, { recursive: true, force: true });
      logger.info(`[wbot:${whatsappIDNumber}] Archivos de sesión eliminados`);
    } catch (fsErr) {
      logger.warn(
        `[wbot:${whatsappIDNumber}] No se pudieron eliminar archivos: ${fsErr}`
      );
    }

    await whatsapp.update({
      status: "DISCONNECTED",
      qrcode: "",
      session: "",
      retries: whatsapp.retries + 1,
      number: ""
    });

    logger.info(`[wbot:${whatsappIDNumber}] Sesión apagada completamente`);
  } catch (error) {
    logger.error(`[wbot:${whatsappIDNumber}] Error al apagar sesión: ${error}`);
    throw new AppError("Failed to shutdown WhatsApp session.");
  }
};

/**
 * Obtiene el estado de salud de una sesión
 */
export const getWbotHealthStatus = (whatsappId: number) => {
  return {
    health: healthChecker.getHealthStatus(whatsappId),
    reconnect: reconnectService.getReconnectStatus(whatsappId),
    hasActiveSession: hasWbot(whatsappId)
  };
};

/**
 * Obtiene todas las sesiones activas
 */
export const getAllSessions = (): Session[] => {
  return [...sessions];
};

// Verificar compatibilidad al cargar el módulo
checkLibraryCompatibility();
