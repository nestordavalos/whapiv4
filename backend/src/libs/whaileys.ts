import type { proto, WASocket } from "@whiskeysockets/baileys";
import path from "path";
import pino from "pino";
import { getIO } from "./socket";
import AppError from "../errors/AppError";
import Whatsapp from "../models/Whatsapp";
import Message from "../models/Message";
import { logger } from "../utils/logger";
import { handleWhaileysMessagesUpsert } from "../services/WbotServices/whaileysMessageListener";
import { cacheLidPhoneMapping } from "../helpers/GetContactJid";
import { loadBaileys } from "./baileys";

export type WhaileysSession = WASocket & { id: number };

const sessions = new Map<number, WhaileysSession>();
const authRoot = path.resolve(__dirname, "../../.whaileys_auth");
const reconnecting = new Set<number>();
// A socket can still emit buffered events after it has been closed. Keep an
// explicit tombstone so those events cannot reconnect or persist credentials.
const stoppedSessions = new Set<number>();
const retryMessages = new Map<number, Map<string, proto.IMessage>>();

const rememberRetryMessage = (whatsappId: number, message: any): void => {
  const messageId = message?.key?.id;
  if (!messageId || !message?.message) return;

  let messages = retryMessages.get(whatsappId);
  if (!messages) {
    messages = new Map<string, proto.IMessage>();
    retryMessages.set(whatsappId, messages);
  }
  messages.set(messageId, message.message);
  setTimeout(() => messages?.delete(messageId), 60_000);
};

const emitSession = (whatsapp: Whatsapp) => {
  getIO().emit("whatsappSession", { action: "update", session: whatsapp });
};

// The UI uses whatsapp-web.js ACK values (0 pending through 4 played).
// Whaileys starts those statuses at 1, so normalize them before persistence.
const toFrontendAck = (status: unknown): number | undefined => {
  const numericStatus = Number(status);
  if (!Number.isInteger(numericStatus)) return undefined;
  return Math.max(0, numericStatus - 1);
};

const markWhaileysMessageAsFailed = async (
  whatsappId: number,
  messageId: string,
  errorCode: string
): Promise<void> => {
  const message = await Message.findByPk(messageId);
  if (!message || !message.fromMe) return;

  await message.update({ ack: -1 });
  getIO().to(message.ticketId.toString()).emit("appMessage", {
    action: "update",
    message
  });
  logger.warn(
    { whatsappId, messageId, errorCode },
    "Whaileys message rejected by WhatsApp"
  );
};

const createBaileysLogger = (whatsappId: number) =>
  pino({
    level: "error",
    hooks: {
      logMethod(inputArgs, method) {
        const attrs = (inputArgs[0] as any)?.attrs;
        if (attrs?.error && attrs?.id) {
          markWhaileysMessageAsFailed(
            whatsappId,
            String(attrs.id),
            String(attrs.error)
          ).catch(err =>
            logger.error(
              { whatsappId, messageId: attrs.id, err },
              "Could not persist Whaileys message failure"
            )
          );
        }
        return method.apply(this, inputArgs as any);
      }
    }
  });

export const getWhaileys = (whatsappId: number): WhaileysSession => {
  const session = sessions.get(whatsappId);
  if (!session) throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  return session;
};

export const whaileysJid = (
  number: string,
  isGroup?: boolean,
  _remoteJid?: string | null
): string => {
  if (number.includes("@")) return number;
  const normalizedNumber = number.replace(/\D/g, "");
  if (isGroup) return `${normalizedNumber}@g.us`;
  // Keep the LID in Contact.remoteJid for correlation, but send direct
  // messages to the phone JID. Baileys v7 currently has an unresolved LID
  // encryption/delivery issue where a @lid relay can be accepted locally yet
  // remain unavailable to the recipient.
  return `${normalizedNumber}@s.whatsapp.net`;
};

export const whaileysContactJid = (
  contact: { number: string; remoteJid?: string | null },
  isGroup?: boolean
): string => whaileysJid(contact.number, isGroup, contact.remoteJid);

export const removeWhaileys = async (
  whatsappId: number,
  logout = false
): Promise<void> => {
  const session = sessions.get(whatsappId);
  stoppedSessions.add(whatsappId);
  sessions.delete(whatsappId);
  retryMessages.delete(whatsappId);

  if (!session) return;

  // Detach first: cleanup may delete the auth directory immediately after
  // this function returns, and an old creds.update must not write into it.
  session.ev.removeAllListeners("creds.update");
  session.ev.removeAllListeners("lid-mapping.update");
  session.ev.removeAllListeners("messages.upsert");
  session.ev.removeAllListeners("messages.update");
  session.ev.removeAllListeners("connection.update");

  if (logout) {
    await session
      .logout()
      .catch(err =>
        logger.warn({ whatsappId, err }, "Could not logout Whaileys session")
      );
    return;
  }

  try {
    session.ws.close();
  } catch (err) {
    logger.debug({ whatsappId, err }, "Could not close Whaileys socket");
  }
};

const scheduleReconnect = (whatsappId: number) => {
  if (reconnecting.has(whatsappId)) return;
  reconnecting.add(whatsappId);

  setTimeout(async () => {
    reconnecting.delete(whatsappId);
    if (stoppedSessions.has(whatsappId)) return;
    const whatsapp = await Whatsapp.findByPk(whatsappId);
    if (!whatsapp || whatsapp.provider !== "whaileys") return;

    initWhaileys(whatsapp).catch(err =>
      logger.error({ whatsappId, err }, "Could not reconnect Whaileys session")
    );
  }, 2000);
};

/**
 * Starts a direct WhatsApp WebSocket session. Auth credentials are stored per
 * connection outside the browser-based WWebJS auth directory.
 */
export const initWhaileys = async (
  whatsapp: Whatsapp
): Promise<WhaileysSession> => {
  const existing = sessions.get(whatsapp.id);
  if (existing) return existing;
  stoppedSessions.delete(whatsapp.id);

  const {
    Browsers,
    DisconnectReason,
    fetchLatestWaWebVersion,
    makeCacheableSignalKeyStore,
    makeWASocket,
    useMultiFileAuthState
  } = await loadBaileys();
  const { state, saveCreds } = await useMultiFileAuthState(
    path.join(authRoot, String(whatsapp.id))
  );
  const { version, isLatest } = await fetchLatestWaWebVersion().catch(err => {
    logger.warn(
      { whatsappId: whatsapp.id, err },
      "Could not fetch the latest WhatsApp Web version; using Baileys fallback"
    );
    return { version: undefined, isLatest: false };
  });
  logger.info(
    { whatsappId: whatsapp.id, version, isLatest },
    "Whaileys WhatsApp Web protocol version selected"
  );
  const session = makeWASocket({
    // Keep the Signal key store transactional/cacheable. This is essential
    // when WhatsApp asks to retry or re-encrypt an outgoing message.
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(
        state.keys,
        logger.child({ whatsappId: whatsapp.id, component: "whaileys" }) as any
      )
    },
    logger: createBaileysLogger(whatsapp.id) as any,
    ...(version ? { version } : {}),
    browser: Browsers.appropriate("T-Chateo"),
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    emitOwnEvents: true,
    generateHighQualityLinkPreview: true,
    retryRequestDelayMs: 500,
    msgRetryCounterMap: {},
    transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3000 },
    getMessage: async key => {
      if (!key.id) return undefined;
      return retryMessages.get(whatsapp.id)?.get(key.id);
    }
  }) as WhaileysSession;

  session.id = whatsapp.id;
  sessions.set(whatsapp.id, session);
  session.ev.on("creds.update", () => {
    saveCreds().catch(err =>
      logger.warn(
        { whatsappId: whatsapp.id, err },
        "Could not persist Whaileys credentials"
      )
    );
  });
  session.ev.on("lid-mapping.update", ({ lid, pn }) => {
    cacheLidPhoneMapping(lid, pn);
    logger.info(
      { whatsappId: whatsapp.id },
      "Whaileys LID phone mapping received"
    );
  });
  session.ev.on("messages.upsert", upsert => {
    upsert.messages.forEach(message =>
      rememberRetryMessage(whatsapp.id, message)
    );
    handleWhaileysMessagesUpsert(session, whatsapp, upsert).catch(err =>
      logger.error(
        { whatsappId: whatsapp.id, err },
        "Error handling Whaileys messages.upsert"
      )
    );
  });
  session.ev.on("messages.update", updates => {
    Promise.all(
      updates.map(async ({ key, update }) => {
        if (!key.id) return;
        logger.info(
          {
            whatsappId: whatsapp.id,
            messageId: key.id,
            fromMe: Boolean(key.fromMe),
            status: (update as any).status,
            error: (update as any).error
          },
          "Whaileys message state update"
        );
        if (update.message) {
          rememberRetryMessage(whatsapp.id, { key, message: update.message });
        }
        if (update.message && key.remoteJid) {
          logger.info(
            {
              whatsappId: whatsapp.id,
              messageId: key.id,
              fromMe: Boolean(key.fromMe)
            },
            "Whaileys own/history message received via messages.update"
          );
          await handleWhaileysMessagesUpsert(session, whatsapp, {
            type: "append",
            messages: [{ ...update, key } as any]
          });
        }

        const message = await Message.findByPk(key.id);
        if (!message) return;

        const ack = toFrontendAck((update as any).status);
        if (ack !== undefined) await message.update({ ack });
        if ((update as any).message?.protocolMessage?.type === 0) {
          await message.update({ isDeleted: true });
        }
        getIO().to(message.ticketId.toString()).emit("appMessage", {
          action: "update",
          message
        });
      })
    ).catch(err =>
      logger.warn(
        { whatsappId: whatsapp.id, err },
        "Could not update Whaileys message state"
      )
    );
  });
  session.ev.on("connection.update", async update => {
    if (stoppedSessions.has(whatsapp.id)) return;
    const current = await Whatsapp.findByPk(whatsapp.id);
    if (!current) return;

    if (update.qr) {
      logger.info({ whatsappId: current.id }, "Whaileys QR generated");
      await current.update({
        status: "qrcode",
        qrcode: update.qr,
        retries: 0,
        number: ""
      });
      emitSession(current);
      return;
    }

    if (update.connection === "open") {
      const number = session.user?.id?.split(":")[0]?.split("@")[0] || "";
      await current.update({
        status: "CONNECTED",
        qrcode: "",
        retries: 0,
        number
      });
      emitSession(current);
      logger.info({ whatsappId: current.id, number }, "Whaileys session ready");
      return;
    }

    if (update.connection !== "close") return;

    sessions.delete(current.id);
    const statusCode = (update.lastDisconnect?.error as any)?.output
      ?.statusCode;
    const loggedOut = statusCode === DisconnectReason.loggedOut;
    logger.warn(
      { whatsappId: current.id, statusCode, loggedOut },
      "Whaileys session closed"
    );
    await current.update({
      status: loggedOut ? "DISCONNECTED" : "OPENING",
      qrcode: loggedOut ? "" : current.qrcode,
      number: loggedOut ? "" : current.number
    });
    emitSession(current);

    if (!loggedOut) scheduleReconnect(current.id);
  });

  return session;
};
