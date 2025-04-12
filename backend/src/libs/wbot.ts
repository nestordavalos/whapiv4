import path from "path";
import qrCode from "qrcode-terminal";
import { Client, LocalAuth, MessageMedia } from "whatsapp-web.js";
import AppError from "../errors/AppError";
import Whatsapp from "../models/Whatsapp";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import { handleMessage } from "../services/WbotServices/wbotMessageListener";
import { logger } from "../utils/logger";
import { getIO } from "./socket";

interface Session extends Client {
  id?: number;
}

const sessions: Session[] = [];

const syncUnreadMessages = async (wbot: Session) => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const chats = await wbot.getChats();
    console.log(`Total de chats carregados: ${chats.length}`);

    /* eslint-disable no-restricted-syntax */
    /* eslint-disable no-await-in-loop */
    for (const chat of chats) {
      if (chat.unreadCount > 0) {
        const unreadMessages = await chat.fetchMessages({
          limit: chat.unreadCount
        });

        for (const msg of unreadMessages) {
          await handleMessage(msg, wbot);
        }

        await chat.sendSeen();
      }
    }
  } catch (error) {
    console.error("Erro ao carregar os chats:", error);
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
        puppeteer: {
          args: [
            "--no-sandbox", // Desativa a sandbox de segurança
            "--disable-setuid-sandbox", // Desativa setuid
            "--disable-dev-shm-usage", // Usa disco em vez de /dev/shm
            // "--single-process", // Força um único processo
            "--log-level=3", // Reduz a verbosidade dos logs
            "--no-default-browser-check",
            "--disable-site-isolation-trials",
            "--no-experiments",
            "--ignore-gpu-blacklist",
            "--ignore-certificate-errors",
            "--ignore-certificate-errors-spki-list",
            "--disable-gpu", // Desativa a GPU (não necessária em headless)
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
            "--disable-background-timer-throttling", // Reduz o uso de timers em segundo plano
            "--disable-features=IsolateOrigins,site-per-process", // Otimiza o isolamento de sites
            // "--renderer-process-limit=2", // Limita o número de processos de renderização
          ],
          executablePath: process.env.CHROME_BIN || undefined,
        },
      });

      const pairingCodeEnabled = true;
      let pairingCodeRequested = false;

      wbot.on("qr", async (qr) => {
        logger.info("Session:", sessionName);

        if (pairingCodeEnabled && !pairingCodeRequested && whatsapp.number) {
          try {
            const code = await wbot.requestPairingCode(whatsapp.number);
            logger.info(`🔐 Código de emparejamiento generado: ${code}`);
            pairingCodeRequested = true;

            await whatsapp.update({ pairingCode: code, status: "PAIRING", qrcode: null });

            io.emit("whatsappSession", {
              action: "update",
              session: whatsapp,
              number: ""
            });

            return;
          } catch (error) {
            logger.error("❌ Error al solicitar pairing code:", error);
          }
        }

        qrCode.generate(qr, { small: true });
        await whatsapp.update({ qrcode: qr, status: "qrcode", retries: 0 });

        const sessionIndex = sessions.findIndex(s => s.id === whatsapp.id);
        if (sessionIndex === -1) {
          wbot.id = whatsapp.id;
          sessions.push(wbot);
        }

        io.emit("whatsappSession", {
          action: "update",
          session: whatsapp,
          number: ""
        });
      });

      wbot.on("authenticated", async () => {
        logger.info(`Session: ${sessionName} AUTHENTICATED`);
      });

      wbot.on("auth_failure", async msg => {
        logger.error(`Session: ${sessionName} AUTHENTICATION FAILURE! Reason: ${msg}`);

        if (whatsapp.retries > 1) {
          await whatsapp.update({ session: "", retries: 0 });
        }

        const retry = whatsapp.retries;
        await whatsapp.update({
          status: "DISCONNECTED",
          retries: retry + 1,
          number: ""
        });

        io.emit("whatsappSession", {
          action: "update",
          session: whatsapp
        });

        reject(new Error("Error starting whatsapp session."));
      });

      wbot.on("ready", async () => {
        logger.info(`Session: ${sessionName} READY`);

        await whatsapp.update({
          status: "CONNECTED",
          qrcode: "",
          pairingCode: null,
          retries: 0,
          number: wbot.info.wid._serialized.split("@")[0]
        });

        io.emit("whatsappSession", {
          action: "update",
          session: whatsapp
        });

        const sessionIndex = sessions.findIndex(s => s.id === whatsapp.id);
        if (sessionIndex === -1) {
          wbot.id = whatsapp.id;
          sessions.push(wbot);
        }

        wbot.sendPresenceAvailable();
        await syncUnreadMessages(wbot);

        // ✅ Escucha de mensajes entrantes en tiempo real
        wbot.on("message", async (message) => {
          try {
            await handleMessage(message, wbot);
          } catch (err) {
            logger.error("Error procesando mensaje entrante:", err);
          }
        });

        resolve(wbot);
      });

      await wbot.initialize();
    } catch (err: any) {
      logger.error(err);
    }
  });
};

export const getWbot = (whatsappId: number): Session => {
  const sessionIndex = sessions.findIndex(s => s.id === whatsappId);

  if (sessionIndex === -1) {
    throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  }
  return sessions[sessionIndex];
};

export const removeWbot = (whatsappId: number): void => {
  try {
    const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
    if (sessionIndex !== -1) {
      sessions[sessionIndex].destroy();
      sessions.splice(sessionIndex, 1);
    }
  } catch (err: any) {
    logger.error(err);
  }
};