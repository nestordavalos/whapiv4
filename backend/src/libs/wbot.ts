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
import FixLidContactsService from "../services/ContactServices/FixLidContactsService";
// import { getWhatsAppConfig } from "../config/whatsapp";
// import {
//   getCircuitBreaker,
//   removeCircuitBreaker
// } from "./WhatsAppCircuitBreaker";
// import { healthChecker } from "./WhatsAppHealthChecker";
// import { reconnectService } from "./WhatsAppReconnectService";

// Extendemos la interfaz Client para nuestras propiedades adicionales
interface Session extends Client {
  id?: number;
  pingInterval?: NodeJS.Timeout;
  lidFixInterval?: NodeJS.Timeout;
  lastHealthCheck?: Date;
  consecutiveFailedChecks?: number;
  healthCheckActive?: boolean;
  initializationTimeout?: NodeJS.Timeout;
}

const sessions: Session[] = [];

const getChatLabel = (chat: any): string => {
  if (typeof chat?.id === "string") return chat.id;
  if (typeof chat?.id?.toString === "function") return chat.id.toString();
  return chat?.name || "unknown";
};

// eslint-disable-next-line no-restricted-syntax
const syncUnreadMessages = async (wbot: Session) => {
  const chats = await wbot.getChats();
  // eslint-disable-next-line no-restricted-syntax
  for (const chat of chats) {
    if (chat.unreadCount > 0) {
      let unreadMessages;
      try {
        // eslint-disable-next-line no-await-in-loop
        unreadMessages = await chat.fetchMessages({
          limit: chat.unreadCount
        });
      } catch (err: any) {
        logger.warn(
          `[wbot] No se pudieron sincronizar mensajes no leídos de ${getChatLabel(
            chat
          )}: ${err.message}`
        );
        // eslint-disable-next-line no-continue
        continue;
      }

      const ids = unreadMessages.map(msg => msg.id.id);
      // eslint-disable-next-line no-await-in-loop
      const existing = await Message.findAll({
        where: { id: { [Op.in]: ids } },
        attributes: ["id"],
        raw: true
      });
      const existingIds = new Set(existing.map(m => m.id));
      const newMessages = unreadMessages
        .filter(msg => !existingIds.has(msg.id.id))
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      // eslint-disable-next-line no-restricted-syntax
      for (const msg of newMessages) {
        try {
          if (!msg.body) {
            msg.body = "";
          }
          // eslint-disable-next-line no-await-in-loop
          await handleMessage(msg, wbot);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          if (err.name === "SequelizeUniqueConstraintError") {
            logger.warn(`[wbot] Duplicate message ignored: ${msg.id.id}`);
            // eslint-disable-next-line no-continue
            continue;
          }
          Sentry.captureException(err);
          logger.error(`[wbot] Error handling unread message: ${err}`);
        }
      }

      try {
        // eslint-disable-next-line no-await-in-loop, no-loop-func
        const isSendSeenAvailable = await wbot.pupPage.evaluate(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return typeof (window as any).WWebJS?.sendSeen === "function";
        });

        if (!isSendSeenAvailable) {
          logger.warn("[wbot] sendSeen no disponible. Reinyectando Utils...");
          // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
          const utils = require("whatsapp-web.js/src/util/Injected/Utils");
          // eslint-disable-next-line no-await-in-loop
          await wbot.pupPage.evaluate(utils.LoadUtils);
        }

        // eslint-disable-next-line no-await-in-loop
        await chat.sendSeen();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        logger.warn(`[wbot] No se pudo marcar como visto: ${err.message}`);

        if (err.message.includes("Execution context was destroyed")) {
          try {
            logger.warn("[wbot] Reintentando tras reinyección...");
            // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
            const utils = require("whatsapp-web.js/src/util/Injected/Utils");
            // eslint-disable-next-line no-await-in-loop
            await wbot.pupPage.evaluate(utils.LoadUtils);
            // eslint-disable-next-line no-await-in-loop
            await chat.sendSeen();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (retryErr: any) {
            logger.error(`[wbot] Fallo persistente: ${retryErr.message}`);
          }
        }
      }
    }
  }
};

export const initWbot = (whatsapp: Whatsapp): Promise<Session> => {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      logger.level = "trace";
      const io = getIO();
      const sessionName = whatsapp.name;
      let sessionCfg;

      if (whatsapp && whatsapp.session) {
        sessionCfg = JSON.parse(whatsapp.session);
      }

      const wbot: Session = new Client({
        session: sessionCfg,
        authStrategy: new LocalAuth({ clientId: `bd_${whatsapp.id}` }),
        restartOnAuthFail: false,
        puppeteer: {
          headless: true,
          devtools: false,
          timeout: 60000,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--log-level=3",
            "--no-default-browser-check",
            "--disable-site-isolation-trials",
            "--no-experiments",
            "--ignore-gpu-blacklist",
            "--ignore-certificate-errors",
            "--ignore-certificate-errors-spki-list",
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--disable-extensions",
            "--disable-default-apps",
            "--enable-features=NetworkService",
            "--disable-webgl",
            "--disable-threaded-animation",
            "--disable-threaded-scrolling",
            "--disable-in-process-stack-traces",
            "--disable-histogram-customizer",
            "--disable-gl-extensions",
            "--disable-composited-antialiasing",
            "--disable-canvas-aa",
            "--disable-3d-apis",
            "--disable-accelerated-2d-canvas",
            "--disable-accelerated-jpeg-decoding",
            "--disable-accelerated-mjpeg-decode",
            "--disable-app-list-dismiss-on-blur",
            "--disable-accelerated-video-decode",
            "--disable-gpu-driver-soluciones-para-errores",
            "--disable-gpu",
            "--no-first-run",
            "--no-zygote",
            "--disable-dev-shm-usage"
          ],
          ignoreDefaultArgs: ["--disable-automation"],
          executablePath: process.env.CHROME_BIN || undefined
        }
      } as any);

      wbot.on("qr", async qr => {
        try {
          logger.info("Session:", sessionName);
          qrCode.generate(qr, { small: true });
          await whatsapp.update({ qrcode: qr, status: "qrcode", retries: 0 });

          if (!sessions.some(s => s.id === whatsapp.id)) {
            wbot.id = whatsapp.id;
            sessions.push(wbot);
          }

          io.emit("whatsappSession", { action: "update", session: whatsapp });
        } catch (err) {
          Sentry.captureException(err);
          logger.error(`Error handling qr: ${err}`);
        }
      });

      wbot.on("authenticated", async _session => {
        try {
          logger.info(`Session: ${sessionName} AUTHENTICATED`);
        } catch (err) {
          Sentry.captureException(err);
          logger.error(`Error handling authenticated: ${err}`);
        }
      });

      wbot.on("auth_failure", async msg => {
        try {
          logger.error(`Session: ${sessionName} AUTH FAILURE - ${msg}`);

          if (whatsapp.retries > 1) {
            await whatsapp.update({ session: "", retries: 0 });
          }

          await whatsapp.update({
            status: "DISCONNECTED",
            retries: whatsapp.retries + 1
          });
          io.emit("whatsappSession", { action: "update", session: whatsapp });
          reject(new Error("Error starting whatsapp session."));
        } catch (err) {
          Sentry.captureException(err);
          logger.error(`Error handling auth_failure: ${err}`);
          reject(err);
        }
      });

      wbot.on("ready", async () => {
        try {
          logger.info(`Session: ${sessionName} READY`);

          await whatsapp.update({
            status: "CONNECTED",
            qrcode: "",
            retries: 0,
            // eslint-disable-next-line no-underscore-dangle
            number: wbot.info.wid._serialized.split("@")[0]
          });

          io.emit("whatsappSession", { action: "update", session: whatsapp });
          if (!sessions.some(s => s.id === whatsapp.id)) {
            wbot.id = whatsapp.id;
            sessions.push(wbot);
          }

          // CRÍTICO: Desactivar authStrategy.logout para evitar EBUSY en Windows
          // Esto debe hacerse aquí para que aplique cuando se cierre la sesión
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const wbotAny = wbot as any;
          if (
            wbotAny.authStrategy &&
            typeof wbotAny.authStrategy.logout === "function"
          ) {
            logger.info(
              `[wbot] Desactivando authStrategy.logout para sesión ${sessionName} (prevenir EBUSY)`
            );
            const originalLogout = wbotAny.authStrategy.logout;
            wbotAny.authStrategy.logout = async () => {
              logger.info(
                `[wbot] authStrategy.logout omitido para ${sessionName} (evitando archivos bloqueados)`
              );
              // No hacer nada - los archivos se eliminarán manualmente después
            };
            // Guardar referencia al logout original por si se necesita
            wbotAny.authStrategy.originalLogout = originalLogout;
          }

          wbot.sendPresenceAvailable();
          try {
            await syncUnreadMessages(wbot);
          } catch (syncErr: any) {
            logger.warn(
              `[wbot] Sincronización inicial de no leídos falló para ${sessionName} (no crítico): ${syncErr.message}`
            );
          }

          // � Auto-fix contactos con números LID en background
          // Se ejecuta sin await para no bloquear la inicialización
          setTimeout(async () => {
            try {
              logger.info(
                `[wbot] Iniciando auto-fix de contactos LID para sesión ${sessionName}`
              );
              const fixResult = await FixLidContactsService(whatsapp.id);
              if (fixResult.totalLidContacts > 0) {
                logger.info(
                  `[wbot] Auto-fix LID completado: ${fixResult.resolved} resueltos, ` +
                    `${fixResult.merged} fusionados, ${fixResult.failed} fallidos ` +
                    `de ${fixResult.totalLidContacts} totales`
                );
              }
            } catch (fixErr) {
              logger.warn(
                `[wbot] Auto-fix LID falló (no crítico): ${fixErr.message}`
              );
            }
          }, 15000); // Esperar 15s para que Store esté completamente cargado

          // �🔁 Verificar conexión cada 60s
          wbot.pingInterval = setInterval(async () => {
            try {
              // Verificar si el cliente aún existe y está inicializado
              if (!wbot.pupPage || wbot.pupPage.isClosed()) {
                logger.warn(
                  "[wbot] Página cerrada, limpiando intervalo de ping"
                );
                if (wbot.pingInterval) clearInterval(wbot.pingInterval);
                return;
              }

              const state = await wbot.getState();
              if (state !== "CONNECTED") {
                logger.warn(`[wbot] Estado inusual: ${state}`);
              }
            } catch (pingErr) {
              // Si es un error de protocolo (sesión cerrada), limpiar el intervalo
              if (
                pingErr.message &&
                pingErr.message.includes("Session closed")
              ) {
                logger.warn(
                  "[wbot] Sesión cerrada detectada, limpiando intervalo de ping"
                );
                if (wbot.pingInterval) clearInterval(wbot.pingInterval);
                return;
              }
              logger.error(`[wbot] Error al hacer ping: ${pingErr.message}`);
            }
          }, 60000);

          // 🔄 Re-escanear contactos LID cada 30 minutos
          wbot.lidFixInterval = setInterval(async () => {
            try {
              if (!wbot.pupPage || wbot.pupPage.isClosed()) {
                if (wbot.lidFixInterval) clearInterval(wbot.lidFixInterval);
                return;
              }
              const fixResult = await FixLidContactsService(whatsapp.id);
              if (fixResult.totalLidContacts > 0 && fixResult.resolved > 0) {
                logger.info(
                  `[wbot] LID periodic fix: ${fixResult.resolved} resueltos de ${fixResult.totalLidContacts}`
                );
              }
            } catch (err) {
              // No crítico — el fix periódico es best-effort
              if (err.message?.includes("Session closed")) {
                if (wbot.lidFixInterval) clearInterval(wbot.lidFixInterval);
              }
            }
          }, 30 * 60 * 1000); // cada 30 minutos

          resolve(wbot);
        } catch (err) {
          Sentry.captureException(err);
          logger.error(`Error handling ready: ${err}`);
          reject(err);
        }
      });

      wbot.on("message", async msg => {
        try {
          await handleMessage(msg, wbot);
        } catch (err) {
          Sentry.captureException(err);
          logger.error(`Error handling message: ${err}`);
        }
      });

      wbot.on("message_ack", async (msg, ack) => {
        try {
          await handleMsgAck(msg, ack, wbot);
        } catch (err) {
          Sentry.captureException(err);
          logger.error(`Error handling message_ack: ${err}`);
        }
      });

      wbot.on("disconnected", async reason => {
        try {
          logger.warn(`Session: ${sessionName} DISCONNECTED - ${reason}`);

          // Limpiar el intervalo de ping cuando se desconecta
          if (wbot.pingInterval) {
            clearInterval(wbot.pingInterval);
            wbot.pingInterval = null;
          }
          if (wbot.lidFixInterval) {
            clearInterval(wbot.lidFixInterval);
            wbot.lidFixInterval = null;
          }

          await whatsapp.update({ status: "DISCONNECTED" });
          io.emit("whatsappSession", { action: "update", session: whatsapp });
        } catch (err) {
          Sentry.captureException(err);
          logger.error(`Error handling disconnected: ${err}`);
        }
      });

      // Initialize WhatsApp client
      try {
        await wbot.initialize();
      } catch (err) {
        Sentry.captureException(err);
        logger.error(`Error initializing wbot: ${err}`);
        reject(err);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      logger.error(err);
      reject(err);
    }
  });
};

export const getWbot = (whatsappId: number): Session => {
  const session = sessions.find(s => s.id === whatsappId);
  if (!session) throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  return session;
};

export const removeWbot = (whatsappId: number): void => {
  const index = sessions.findIndex(s => s.id === whatsappId);
  if (index !== -1) {
    const session = sessions[index];
    // Solo limpiar recursos, el destroy ya se hizo antes
    if (session.pingInterval) {
      clearInterval(session.pingInterval);
      session.pingInterval = undefined;
    }
    if (session.lidFixInterval) {
      clearInterval(session.lidFixInterval);
      session.lidFixInterval = undefined;
    }
    // Remover de la lista sin hacer destroy adicional
    sessions.splice(index, 1);
    logger.info(`[removeWbot] Sesión ${whatsappId} removida exitosamente`);
  }
};

export const restartWbot = async (whatsappId: number): Promise<Session> => {
  try {
    logger.info(`[restartWbot] Buscando sesión con ID: ${whatsappId}`);

    const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
    if (sessionIndex === -1) {
      logger.warn(`[restartWbot] Sesión con ID ${whatsappId} no encontrada`);
      throw new AppError("WhatsApp session not initialized.");
    }

    const whatsapp = await Whatsapp.findByPk(whatsappId);
    if (!whatsapp) {
      logger.error(
        `[restartWbot] WhatsApp con ID ${whatsappId} no existe en DB`
      );
      throw new AppError("WhatsApp not found.");
    }

    logger.info(
      `[restartWbot] Limpiando intervalo de ping para ID: ${whatsappId}`
    );
    // Limpiar el intervalo de ping antes de destruir
    const session = sessions[sessionIndex];
    if (session.pingInterval) {
      clearInterval(session.pingInterval);
      session.pingInterval = undefined;
    }
    if (session.lidFixInterval) {
      clearInterval(session.lidFixInterval);
      session.lidFixInterval = undefined;
    }

    logger.info(`[restartWbot] Destruyendo sesión para ID: ${whatsappId}`);
    session.destroy();
    sessions.splice(sessionIndex, 1);

    // Esperar un poco antes de reiniciar para asegurar limpieza completa
    await new Promise(resolve => setTimeout(resolve, 1000));

    logger.info(`[restartWbot] Iniciando nueva sesión para ID: ${whatsappId}`);
    const newSession = await initWbot(whatsapp);

    logger.info(
      `[restartWbot] Sesión reiniciada exitosamente para ID: ${whatsappId}`
    );
    return newSession;
  } catch (error) {
    logger.error(
      `[restartWbot] Error al reiniciar sesión ${whatsappId}: ${error}`
    );
    throw error;
  }
};

export const shutdownWbot = async (whatsappId: string): Promise<void> => {
  const whatsappIDNumber: number = parseInt(whatsappId, 10);

  if (Number.isNaN(whatsappIDNumber)) {
    throw new AppError("Invalid WhatsApp ID format.");
  }

  const whatsapp = await Whatsapp.findByPk(whatsappIDNumber);
  if (!whatsapp) {
    throw new AppError("WhatsApp not found.");
  }

  const sessionIndex = sessions.findIndex(s => s.id === whatsappIDNumber);
  if (sessionIndex === -1) {
    logger.warn(`Sessão com ID ${whatsappIDNumber} não foi encontrada.`);
    throw new AppError("WhatsApp session not initialized.");
  }

  const sessionPath = path.resolve(
    __dirname,
    `../../.wwebjs_auth/session-bd_${whatsappIDNumber}`
  );

  try {
    logger.info(`Desligando sessão para WhatsApp ID: ${whatsappIDNumber}`);

    // Limpiar el intervalo de ping antes de destruir
    const session = sessions[sessionIndex];
    if (session.pingInterval) {
      clearInterval(session.pingInterval);
      session.pingInterval = undefined;
    }
    if (session.lidFixInterval) {
      clearInterval(session.lidFixInterval);
      session.lidFixInterval = undefined;
    }

    await session.destroy();
    logger.info(`Sessão com ID ${whatsappIDNumber} desligada com sucesso.`);

    // Esperar para que se liberen los archivos (especialmente en Windows)
    await new Promise(resolve => setTimeout(resolve, 3000));

    logger.info(`Removendo arquivos da sessão: ${sessionPath}`);

    // Intentar eliminar los archivos con reintentos para manejar bloqueos en Windows
    let deleteSuccess = false;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await fs.rm(sessionPath, { recursive: true, force: true });
        logger.info(`Arquivos da sessão removidos com sucesso: ${sessionPath}`);
        deleteSuccess = true;
        break;
      } catch (rmError) {
        logger.warn(
          `Intento ${attempt}/3 falló al eliminar archivos: ${rmError.message}`
        );
        if (attempt < 3) {
          // Esperar antes de reintentar (2s, luego 4s)
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
    }

    if (!deleteSuccess) {
      logger.error(
        `No se pudieron eliminar los archivos de sesión después de 3 intentos. Path: ${sessionPath}`
      );
      // No lanzar error, solo advertir - la sesión seguirá desconectada
    }

    sessions.splice(sessionIndex, 1);
    logger.info(
      `Sessão com ID ${whatsappIDNumber} removida da lista de sessões.`
    );

    const retry = whatsapp.retries;
    await whatsapp.update({
      status: "DISCONNECTED",
      qrcode: "",
      session: "",
      retries: retry + 1,
      number: ""
    });

    // Se necesitas reiniciar la sesión, importa y llama a StartWhatsAppSession aquí
    // import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
    // StartWhatsAppSession(whatsapp);
    // Si no es necesario, puedes dejarlo comentado.
  } catch (error) {
    logger.error(
      `Erro ao desligar ou limpar a sessão com ID ${whatsappIDNumber}: ${error}`
    );
    throw new AppError("Failed to destroy WhatsApp session.");
  }
};
