import qrCode from "qrcode-terminal";
import { Client, LocalAuth } from "whatsapp-web.js";
import { getIO } from "./socket";
import Whatsapp from "../models/Whatsapp";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";
import { handleMsgAck, handleMessage } from "../services/WbotServices/wbotMessageListener";
import * as Sentry from "@sentry/node";

interface Session extends Client {
  id?: number;
  pingInterval?: NodeJS.Timeout;
}

const sessions: Session[] = [];

const syncUnreadMessages = async (wbot: Session) => {
  const chats = await wbot.getChats();
  for (const chat of chats) {
    if (chat.unreadCount > 0) {
      const unreadMessages = await chat.fetchMessages({ limit: chat.unreadCount });
      for (const msg of unreadMessages) {
        try {
          await handleMessage(msg, wbot);
        } catch (err) {
          Sentry.captureException(err);
          logger.error(`[wbot] Error handling unread message: ${err}`);
        }
      }

      try {
        const isSendSeenAvailable = await wbot.pupPage.evaluate(() => {
          return typeof (window as any).WWebJS?.sendSeen === 'function';
        });

        if (!isSendSeenAvailable) {
          console.warn('[wbot] sendSeen no disponible. Reinyectando Utils...');
          const utils = require('whatsapp-web.js/src/util/Injected/Utils');
          await wbot.pupPage.evaluate(utils.LoadUtils);
        }

        await chat.sendSeen();
      } catch (err: any) {
        logger.warn(`[wbot] No se pudo marcar como visto: ${err.message}`);

        if (err.message.includes("Execution context was destroyed")) {
          try {
            logger.warn("[wbot] Reintentando tras reinyección...");
            const utils = require('whatsapp-web.js/src/util/Injected/Utils');
            await wbot.pupPage.evaluate(utils.LoadUtils);
            await chat.sendSeen();
          } catch (retryErr: any) {
            logger.error(`[wbot] Fallo persistente: ${retryErr.message}`);
          }
        }
      }
    }
  }
};

export const initWbot = async (whatsapp: Whatsapp): Promise<Session> => {
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
            '--disable-gpu',
            "--no-first-run",
            "--no-zygote",
            '--disable-dev-shm-usage'
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

      wbot.on("authenticated", async session => {
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

          await whatsapp.update({ status: "DISCONNECTED", retries: whatsapp.retries + 1 });
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

      wbot.on("disconnected", async (reason) => {
        try {
          logger.warn(`Session: ${sessionName} DISCONNECTED - ${reason}`);
          await whatsapp.update({ status: "DISCONNECTED" });
          io.emit("whatsappSession", { action: "update", session: whatsapp });
        } catch (err) {
          Sentry.captureException(err);
          logger.error(`Error handling disconnected: ${err}`);
        }
      });

      try {
        await wbot.initialize();
      } catch (err) {
        Sentry.captureException(err);
        logger.error(`Error initializing wbot: ${err}`);
        reject(err);
      }

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