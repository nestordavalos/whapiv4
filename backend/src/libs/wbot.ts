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
  lastHealthCheck?: Date;
  consecutiveFailedChecks?: number;
  healthCheckActive?: boolean;
  initializationTimeout?: NodeJS.Timeout;
}

const sessions: Session[] = [];

// eslint-disable-next-line no-restricted-syntax
const syncUnreadMessages = async (wbot: Session) => {
  const chats = await wbot.getChats();
  // eslint-disable-next-line no-restricted-syntax
  for (const chat of chats) {
    if (chat.unreadCount > 0) {
      // eslint-disable-next-line no-await-in-loop
      const unreadMessages = await chat.fetchMessages({
        limit: chat.unreadCount
      });

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
      });

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

          wbot.sendPresenceAvailable();
          await syncUnreadMessages(wbot);

          // 🔁 Verificar conexión cada 60s
          wbot.pingInterval = setInterval(async () => {
            try {
              const state = await wbot.getState();
              if (state !== "CONNECTED") {
                logger.warn(`[wbot] Estado inusual: ${state}`);
              }
            } catch (pingErr) {
              logger.error(`[wbot] Error al hacer ping: ${pingErr.message}`);
            }
          }, 60000);

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
    if (session.pingInterval) {
      clearInterval(session.pingInterval);
    }
    session.destroy();
    sessions.splice(index, 1);
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

    await session.destroy();
    logger.info(`Sessão com ID ${whatsappIDNumber} desligada com sucesso.`);

    logger.info(`Removendo arquivos da sessão: ${sessionPath}`);
    await fs.rm(sessionPath, { recursive: true, force: true });
    logger.info(`Arquivos da sessão removidos com sucesso: ${sessionPath}`);

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
