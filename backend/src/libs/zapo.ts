import Whatsapp from "../models/Whatsapp";
import Message from "../models/Message";
import AppError from "../errors/AppError";
import { getIO } from "./socket";
import { logger } from "../utils/logger";
import { handleZapoMessage } from "../services/WbotServices/zapoMessageListener";
import HandleMessageEditService from "../services/MessageServices/HandleMessageEditService";
import HandleMessageReactionService from "../services/MessageServices/HandleMessageReactionService";
import { unblockZapoRecipientByJid } from "../services/WbotServices/ZapoRecipientSendBlockService";
import {
  sendConnectionUpdateWebhook,
  sendMessageAckWebhook
} from "../services/WebhookService/SendWebhookEvent";

// Node 20 does not provide a global WebSocket, while Zapo expects the Web
// platform constructor to exist. Keep the polyfill local to Node runtimes;
// newer Node releases already provide it natively.
if (!(globalThis as any).WebSocket) {
  (globalThis as any).WebSocket = require("ws");
}

const zapo = require("zapo-js") as any;
const zapoMysql = require("@zapo-js/store-mysql") as any;
const { createMediaProcessor } = require("@zapo-js/media-utils") as any;
const mediaProcessor = createMediaProcessor();

export type ZapoSession = any;
const sessions = new Map<number, ZapoSession>();
const stores = new Map<number, any>();
const reconnecting = new Set<number>();
const recentMessages = new Map<string, any>();
const recentMessageKeys = new Map<
  string,
  { participant?: string; remoteJid?: string }
>();
const syncContexts = new Map<number, any>();
const historyProcessing = new Map<number, Promise<number>>();
const outboundMessageChains = new Map<number, Promise<void>>();
const lastOutboundMessageAt = new Map<number, number>();
const recipientJidCache = new Map<string, string>();
let mysqlMigrationPromise: Promise<void> | undefined;
const OUTBOUND_MESSAGE_DELAY_MS = 2000;
const emitSession = (whatsapp: Whatsapp) =>
  getIO().emit("whatsappSession", { action: "update", session: whatsapp });
const sessionIdFor = (id: number) => `whatsapp-${id}`;
const hasRenderableZapoContent = (message: any): boolean => {
  const content =
    message?.ephemeralMessage?.message ||
    message?.viewOnceMessage?.message ||
    message?.viewOnceMessageV2?.message ||
    message?.viewOnceMessageV2Extension?.message ||
    message?.documentWithCaptionMessage?.message ||
    message ||
    {};
  return Boolean(
      content.conversation ||
      content.extendedTextMessage?.text ||
      content.templateMessage?.interactiveMessageTemplate?.body?.text ||
      content.templateMessage?.hydratedTemplate?.hydratedContentText ||
      content.interactiveMessage?.body?.text ||
      content.buttonsMessage?.contentText ||
      content.listMessage?.description ||
      content.imageMessage ||
      content.videoMessage ||
      content.audioMessage ||
      content.documentMessage ||
      content.stickerMessage ||
      content.contactMessage?.vcard ||
      content.contactsArrayMessage?.contacts?.length ||
      content.locationMessage ||
      content.liveLocationMessage
  );
};
const waitForZapoRemoteLogout = (session: ZapoSession): Promise<void> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      session.off("connection", onConnection);
      reject(
        new Error(
          "WhatsApp did not confirm removal of the Zapo companion device"
        )
      );
    }, 15000);
    const onConnection = (event: any) => {
      if (event?.status !== "close") return;
      clearTimeout(timeout);
      session.off("connection", onConnection);
      if (event.isLogout) {
        resolve();
      } else {
        reject(
          new Error(
            `WhatsApp closed Zapo without unpairing the device (${event.reason || "unknown"})`
          )
        );
      }
    };
    session.on("connection", onConnection);
  });
const messageText = (message: any): string => {
  const content =
    // WhatsApp can deliver an edit inside a ProtocolMessage.  Zapo's
    // decrypted `message_addon` event already gives us the inner message,
    // whereas protocol edits retain this wrapper.
    message?.editedMessage?.message ||
    message?.protocolMessage?.editedMessage?.message ||
    message?.protocolMessage?.editedMessage ||
    message?.ephemeralMessage?.message ||
    message?.viewOnceMessage?.message ||
    message?.viewOnceMessageV2?.message ||
    message ||
    {};
  return content.conversation || content.extendedTextMessage?.text || "";
};

const createZapoStore = () => {
  const mysql = zapoMysql.createMysqlStore({
    pool: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    },
    tablePrefix: "zapo_"
  });
  return {
    mysql,
    store: zapo.createStore({
      backends: { mysql },
      providers: {
        auth: "mysql",
        signal: "mysql",
        preKey: "mysql",
        session: "mysql",
        identity: "mysql",
        senderKey: "mysql",
        appState: "mysql",
        privacyToken: "mysql",
        messages: "mysql",
        threads: "mysql",
        contacts: "mysql"
      },
      // Sending to a group requires its participant roster. Persist it so a
      // normal process restart does not force an avoidable metadata query
      // before the first outgoing group message.
      cacheProviders: {
        groupMetadata: "mysql"
      }
    })
  };
};

// @zapo-js/store-mysql lazily migrates each persistence domain. When several
// Zapo sessions boot together, two pools can see the same pending migration
// and race on ALTER TABLE. Run every Zapo schema migration once per process
// before opening a session to make startup deterministic.
const ensureZapoMysqlMigrations = async (mysql: any): Promise<void> => {
  if (!mysqlMigrationPromise) {
    const domains = [
      "auth",
      "signal",
      "senderKey",
      "appState",
      "retry",
      "mailbox",
      "participants",
      "deviceList",
      "privacyToken",
      "messageSecret"
    ];
    const migrate = () =>
      zapoMysql.ensureMysqlMigrations(mysql.pool, domains, "zapo_");
    mysqlMigrationPromise = (async () => {
      try {
        await migrate();
      } catch (err) {
        // MySQL DDL commits implicitly. An old concurrent startup can therefore
        // add the columns but fail before recording Zapo migration 0011. Repair
        // only that verified, fully-applied state, then let Zapo run normally.
        const duplicateDeviceInfo =
          (err as any)?.code === "ER_DUP_FIELDNAME" &&
          String((err as any)?.message || "").includes("device_info");
        if (!duplicateDeviceInfo) throw err;

        const [rows] = await mysql.pool.execute(
          `SELECT COLUMN_NAME
             FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = "zapo_auth_credentials"
              AND COLUMN_NAME IN ("device_info", "push_name", "year_class", "mem_class")`
        );
        const expected = new Set([
          "device_info",
          "push_name",
          "year_class",
          "mem_class"
        ]);
        const actual = new Set((rows as any[]).map(row => row.COLUMN_NAME));
        if (![...expected].every(column => actual.has(column))) throw err;

        await mysql.pool.execute(
          "INSERT IGNORE INTO `zapo__migrations` (name, applied_at) VALUES (?, ?)",
          ["0011_auth_credentials_mobile_transport", Date.now()]
        );
        logger.warn(
          "Recovered completed Zapo MySQL migration 0011 after a concurrent startup"
        );
        await migrate();
      }
    })()
      .catch(err => {
        mysqlMigrationPromise = undefined;
        throw err;
      });
  }
  await mysqlMigrationPromise;
};

export const getZapo = (id: number): ZapoSession => {
  const session = sessions.get(id);
  if (!session) throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  return session;
};

/**
 * Used by the 463 gate to recover a persisted token after a process restart
 * or history sync. Zapo itself remains responsible for rejecting expired
 * tokens at send time.
 */
export const hasZapoTrustedContactToken = async (
  whatsappId: number,
  remoteJid: string
): Promise<boolean> => {
  const mysql = stores.get(whatsappId);
  if (!mysql) return false;

  const token = await mysql.stores
    .privacyToken(sessionIdFor(whatsappId))
    .getByJid(remoteJid);
  return Boolean(token?.tcToken && token.tcTokenTimestamp);
};

/** Prefer the LID that WhatsApp currently assigns to a phone contact. */
export const resolveZapoRecipientJid = async (
  whatsappId: number,
  number: string,
  isGroup = false,
  knownJid?: string
): Promise<string> => {
  if (isGroup) return zapoJid(number, true, knownJid);
  if (knownJid?.endsWith("@lid")) return knownJid;
  if (number.includes("@lid")) return number;

  const phone = number.replace(/\D/g, "");
  if (!phone) return zapoJid(number, false, knownJid);
  const cacheKey = `${whatsappId}:${phone}`;
  const cached = recipientJidCache.get(cacheKey);
  if (cached) return cached;

  try {
    const [result] = await getZapo(whatsappId).profile.getLidsByPhoneNumbers([
      phone
    ]);
    if (result?.exists && result?.lidJid) {
      recipientJidCache.set(cacheKey, result.lidJid);
      return result.lidJid;
    }
  } catch (err) {
    logger.debug(
      { whatsappId, phone, err },
      "Could not resolve Zapo recipient LID; falling back to PN"
    );
  }
  return knownJid || `${phone}@s.whatsapp.net`;
};

/**
 * Serializes regular outbound messages for a WhatsApp connection. This is
 * deliberately shared by agents, queues and API sends, so concurrent users
 * cannot burst messages through the same linked device.
 */
export const sendZapoMessage = async (
  whatsappId: number,
  to: string,
  content: any,
  options?: any
): Promise<any> => {
  const previous = outboundMessageChains.get(whatsappId) || Promise.resolve();
  let resolveChain!: () => void;
  const chain = new Promise<void>(resolve => {
    resolveChain = resolve;
  });
  const tail = previous.catch(() => undefined).then(() => chain);
  outboundMessageChains.set(whatsappId, tail);

  await previous.catch(() => undefined);
  let session: ZapoSession | undefined;
  try {
    session = getZapo(whatsappId);
    // Show a natural typing state for the anti-spam interval. It is sent only
    // when this message reaches the front of the per-connection queue.
    const isAudio = content?.type === "audio";
    await session.presence
      .sendChatstate(to, {
        state: "composing",
        ...(isAudio ? { media: "audio" } : {})
      })
      .catch(err =>
        logger.debug(
          { whatsappId, to, err },
          "Could not send Zapo typing chatstate"
        )
      );
    // The first outbound message must wait too; otherwise the typing signal
    // is immediately replaced by the message and is never visible remotely.
    const lastSentAt = lastOutboundMessageAt.get(whatsappId) || Date.now();
    const earliest = lastSentAt + OUTBOUND_MESSAGE_DELAY_MS;
    const waitMs = Math.max(0, earliest - Date.now());
    if (waitMs > 0) {
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
    lastOutboundMessageAt.set(whatsappId, Date.now());
    const sent = await session.message.send(to, content, options);
    logger.info(
      {
        whatsappId,
        to,
        messageId: sent.id,
        attempts: sent.attempts,
        ack: sent.ack
      },
      "Zapo outbound message accepted by WhatsApp"
    );
    return sent;
  } finally {
    if (session) {
      await session.presence
        .sendChatstate(to, { state: "paused" })
        .catch(err =>
          logger.debug(
            { whatsappId, to, err },
            "Could not clear Zapo typing chatstate"
          )
        );
    }
    resolveChain();
    if (outboundMessageChains.get(whatsappId) === tail) {
      outboundMessageChains.delete(whatsappId);
    }
  }
};

export const getZapoStoredContacts = async (
  id: number
): Promise<
  Array<{
    jid: string;
    displayName?: string;
    pushName?: string;
    phoneNumber?: string;
  }>
> => {
  const mysql = stores.get(id);
  if (!mysql) throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  const [rows] = await mysql.pool.execute(
    `SELECT jid, display_name AS displayName, push_name AS pushName,
            phone_number AS phoneNumber
       FROM zapo_mailbox_contacts
      WHERE session_id = ?`,
    [sessionIdFor(id)]
  );
  return rows as Array<{
    jid: string;
    displayName?: string;
    pushName?: string;
    phoneNumber?: string;
  }>;
};

export const getZapoStoredContact = async (
  id: number,
  jid: string
): Promise<{
  phoneNumber?: string;
  displayName?: string;
  pushName?: string;
} | null> => {
  const mysql = stores.get(id);
  if (!mysql) throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  const record = await mysql.stores
    .contacts(sessionIdFor(id))
    .getByJid(jid.includes("@") ? jid : `${jid}@lid`);
  return record
    ? {
        phoneNumber: record.phoneNumber,
        displayName: record.displayName,
        pushName: record.pushName
      }
    : null;
};

/** Returns the already-synchronized mailbox title for a chat/group. */
export const getZapoStoredThreadName = async (
  id: number,
  jid: string
): Promise<string | undefined> => {
  const mysql = stores.get(id);
  if (!mysql) throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  const thread = await mysql.stores
    .threads(sessionIdFor(id))
    .getByJid(jid);
  return thread?.name?.trim() || undefined;
};

export const requestZapoHistorySync = async (
  id: number,
  options: {
    mode: "unread" | "all";
    maxChats: number;
    maxMessages: number;
    delayBetweenChats?: number;
    maxMessageAgeHours?: number;
    markAsSeen?: boolean;
    createClosedForRead?: boolean;
  }
): Promise<{
  requestedChats: number;
  failedChats: number;
  mode: "unread" | "all";
}> => {
  const session = getZapo(id);
  const mysql = stores.get(id);
  if (!mysql) throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  const whatsapp = await Whatsapp.findByPk(id);
  if (!whatsapp) throw new AppError("ERR_NO_WAPP_FOUND", 404);
  // Same reason as the message query below: the generic store method caps
  // threads at 100, while the connection configuration allows up to 1,000.
  const maxChats = Math.min(Math.max(Math.floor(options.maxChats || 1), 1), 1000);
  const [threadRows] = await mysql.pool.execute(
    // A history chunk can persist messages before (or without) a matching
    // mailbox_threads row. Drive the selection from the messages table so a
    // real chat never becomes invisible to a manual recovery.
    `SELECT message.thread_jid AS jid,
            COALESCE(MAX(thread.unread_count), 0) AS unread_count,
            MAX(message.timestamp_ms) AS last_message_ms
       FROM zapo_mailbox_messages AS message
  LEFT JOIN zapo_mailbox_threads AS thread
         ON thread.session_id = message.session_id
        AND thread.jid = message.thread_jid
      WHERE message.session_id = ?
        AND message.thread_jid NOT LIKE '%@newsletter'
        AND message.thread_jid NOT LIKE '%@broadcast'
        AND (? = TRUE OR message.thread_jid NOT LIKE '%@g.us')
   GROUP BY message.thread_jid
   ORDER BY unread_count DESC, last_message_ms DESC, message.thread_jid ASC
      LIMIT ?`,
    [sessionIdFor(id), Boolean(whatsapp.isGroup), maxChats]
  );
  const threads = (threadRows as any[]).map(row => ({
    jid: row.jid,
    unreadCount: row.unread_count === null ? 0 : Number(row.unread_count)
  }));
  const selected = (options.mode === "unread"
    ? threads.filter((thread: any) => (thread.unreadCount || 0) > 0)
    : threads
  );

  // Keep the server-side limits aligned with the connection form.  Zapo does
  // not impose the old whatsapp-web.js 50-message limit; the previous cap
  // silently ignored configurations such as "201 messages per chat".
  const maxMessages = Math.min(Math.max(Math.floor(options.maxMessages || 1), 1), 500);
  const maxMessageAgeHours = Math.min(
    Math.max(Math.floor(options.maxMessageAgeHours || 24), 1),
    720
  );
  const delay = Math.min(Math.max(options.delayBetweenChats || 0, 0), 5000);
  const expiresAt =
    Date.now() + Math.max(30 * 60 * 1000, selected.length * (delay + 1000) + 30 * 60 * 1000);

  syncContexts.set(id, {
    mode: options.mode,
    expiresAt,
    maxMessageAgeHours,
    maxMessages,
    markAsSeen: Boolean(options.markAsSeen),
    createClosedForRead: Boolean(options.createClosedForRead),
    unreadByJid: new Map(
      selected.map((thread: any) => [thread.jid, Number(thread.unreadCount || 0)])
    ),
    // A history import can take longer than the normal ticket timeout while
    // media is downloaded. Keep the resolved ticket per contact for this run
    // so a batch never turns into one closed ticket per message.
    ticketsByContactId: new Map<number, any>(),
    // Once a request is sent, this marks the boundary between the mailbox
    // we already had and the older page WhatsApp is about to deliver.
    cursorTimestampByJid: new Map<string, number>()
  });

  // A previous failed import may already be present in Zapo's durable
  // mailbox. Import that window first; the later on-demand chunks page
  // backwards from it. This makes a retry recover messages missing only from
  // our platform, while Message.id keeps it safely idempotent.
  await processZapoHistorySync(whatsapp);

  let failedChats = 0;

  // Request one chat at a time. Apart from respecting the inbox setting, this
  // prevents a large mailbox from issuing a burst of peer-data requests.
  for (let index = 0; index < selected.length; index += 1) {
    const thread: any = selected[index];
    try {
      // On-demand history is paginated backwards. The local Zapo mailbox is
      // the current top of the imported window, so use its oldest row as the
      // cursor when it exists. Without it WhatsApp only chooses its default
      // recent window and the configured historical sync is ineffective.
      const [cursorRows] = await mysql.pool.execute(
        `SELECT message_id, from_me, timestamp_ms
           FROM zapo_mailbox_messages
          WHERE session_id = ? AND thread_jid = ? AND timestamp_ms IS NOT NULL
          ORDER BY timestamp_ms ASC, message_id ASC
          LIMIT 1`,
        [sessionIdFor(id), thread.jid]
      );
      const cursor = (cursorRows as any[])[0];
      if (cursor) {
        syncContexts
          .get(id)
          ?.cursorTimestampByJid.set(thread.jid, Number(cursor.timestamp_ms));
      }
      await session.message.requestHistorySync({
        chatJid: thread.jid,
        count: maxMessages,
        ...(cursor
          ? {
              oldestMsgId: cursor.message_id,
              oldestMsgFromMe: Number(cursor.from_me) === 1,
              oldestMsgTimestampMs: Number(cursor.timestamp_ms)
            }
          : {})
      });
    } catch (err) {
      failedChats += 1;
      logger.warn(
        { whatsappId: id, jid: thread.jid, err },
        "Could not request Zapo chat history"
      );
    }

    if (delay > 0 && index < selected.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return { requestedChats: selected.length, failedChats, mode: options.mode };
};

export const getZapoSyncContext = (id: number, jid: string): any => {
  const context = syncContexts.get(id);
  if (!context) return undefined;
  if (context.expiresAt < Date.now()) {
    syncContexts.delete(id);
    return undefined;
  }
  const unreadCount = context.unreadByJid.get(jid);
  return unreadCount === undefined ? undefined : { ...context, unreadCount };
};

const processZapoHistorySync = async (
  whatsapp: Whatsapp
): Promise<number> => {
  const context = syncContexts.get(whatsapp.id);
  const session = sessions.get(whatsapp.id);
  const mysql = stores.get(whatsapp.id);
  if (!context || !session || !mysql || context.expiresAt < Date.now()) return 0;

  let processed = 0;
  const cutoffTimestampMs =
    Date.now() - context.maxMessageAgeHours * 60 * 60 * 1000;
  for (const jid of context.unreadByJid.keys()) {
    let processedForChat = 0;
    // The store's public listByThread API intentionally caps results at 50.
    // Read the persisted mailbox directly here so the connection setting
    // (1–500 messages per chat) is honored exactly.
    const cursorTimestamp = context.cursorTimestampByJid?.get(jid);
    const [rows] = await mysql.pool.execute(
      `SELECT mailbox.message_id, mailbox.thread_jid, mailbox.sender_jid,
              mailbox.participant_jid, mailbox.from_me, mailbox.timestamp_ms,
              mailbox.message_bytes
         FROM zapo_mailbox_messages AS mailbox
    LEFT JOIN Messages AS existing_message
           ON existing_message.id = mailbox.message_id
        WHERE mailbox.session_id = ? AND mailbox.thread_jid = ?
          AND mailbox.timestamp_ms >= ?
          AND existing_message.id IS NULL
          ${cursorTimestamp ? "AND timestamp_ms < ?" : ""}
        ORDER BY mailbox.timestamp_ms DESC, mailbox.message_id DESC
        LIMIT ?`,
      cursorTimestamp
        ? [
            sessionIdFor(whatsapp.id),
            jid,
            cutoffTimestampMs,
            cursorTimestamp,
            Math.min(context.maxMessages * 10, 5000)
          ]
        : [
            sessionIdFor(whatsapp.id),
            jid,
            cutoffTimestampMs,
            Math.min(context.maxMessages * 10, 5000)
          ]
    );
    const records = (rows as any[]).map(row => ({
      id: row.message_id,
      threadJid: row.thread_jid,
      senderJid: row.sender_jid || undefined,
      participantJid: row.participant_jid || undefined,
      fromMe: Number(row.from_me) === 1,
      timestampMs: row.timestamp_ms === null ? undefined : Number(row.timestamp_ms),
      messageBytes: row.message_bytes || undefined
    }));
    const storedContact = await mysql.stores
      .contacts(sessionIdFor(whatsapp.id))
      .getByJid(jid);

    // Zapo persists history chunks but deliberately does not emit `message`
    // for them. Rehydrate the exact incoming-event shape our normal pipeline
    // uses, so ticket creation, media, queues, sockets and webhooks remain
    // identical for live and synchronized messages.
    for (const record of [...records].reverse()) {
      if (!record.messageBytes) continue;
      if (await Message.findByPk(record.id)) continue;
      const decodedMessage = zapo.proto.Message.decode(record.messageBytes);
      if (!hasRenderableZapoContent(decodedMessage)) continue;
      await handleZapoMessage(session, whatsapp, {
        key: {
          id: record.id,
          remoteJid: record.threadJid,
          remoteJidAlt: storedContact?.phoneNumber,
          participant: record.participantJid || record.senderJid,
          fromMe: record.fromMe,
          isGroup: record.threadJid.endsWith("@g.us")
        },
        timestampSeconds: record.timestampMs
          ? Math.floor(record.timestampMs / 1000)
          : undefined,
        historySync: true,
        message: decodedMessage
      });
      processed += 1;
      processedForChat += 1;
      if (processedForChat >= context.maxMessages) break;
    }
  }
  return processed;
};

const queueZapoHistoryProcessing = (whatsapp: Whatsapp): Promise<number> => {
  const previous = historyProcessing.get(whatsapp.id) || Promise.resolve(0);
  const current = previous
    .catch(() => 0)
    .then(() => processZapoHistorySync(whatsapp));
  historyProcessing.set(whatsapp.id, current);
  return current.finally(() => {
    if (historyProcessing.get(whatsapp.id) === current) {
      historyProcessing.delete(whatsapp.id);
    }
  });
};
const messageCacheKey = (whatsappId: number, messageId: string) =>
  `${whatsappId}:${messageId}`;

// The message mailbox is write-behind persisted. Keep a short in-memory copy
// as well so an agent can reply immediately to a just-received message.
export const cacheZapoMessage = (
  whatsappId: number,
  messageId: string,
  message: any,
  key?: { participant?: string; remoteJid?: string }
): void => {
  const cacheKey = messageCacheKey(whatsappId, messageId);
  recentMessages.set(cacheKey, message);
  if (key?.participant || key?.remoteJid) {
    recentMessageKeys.set(cacheKey, {
      participant: key.participant,
      remoteJid: key.remoteJid
    });
  }
  if (recentMessages.size > 1000) {
    const oldestKey = recentMessages.keys().next().value as string;
    recentMessages.delete(oldestKey);
    recentMessageKeys.delete(oldestKey);
  }
};

export const getZapoQuoteMetadata = async (
  whatsappId: number,
  messageId: string
): Promise<{ message?: any; participant?: string }> => {
  const cacheKey = messageCacheKey(whatsappId, messageId);
  const recent = recentMessages.get(cacheKey);
  const recentKey = recentMessageKeys.get(cacheKey);
  if (recent) {
    return { message: recent, participant: recentKey?.participant };
  }

  const mysql = stores.get(whatsappId);
  if (!mysql) return {};
  const record = await mysql.stores
    .messages(sessionIdFor(whatsappId))
    .getById(messageId);
  return {
    message: record?.messageBytes
      ? zapo.proto.Message.decode(record.messageBytes)
      : undefined,
    participant: record?.participantJid || record?.senderJid
  };
};

export const getZapoQuotedMessage = async (
  whatsappId: number,
  messageId: string
): Promise<any | undefined> => {
  return (await getZapoQuoteMetadata(whatsappId, messageId)).message;
};
export const zapoJid = (
  number: string,
  group?: boolean,
  knownJid?: string
): string => {
  if (knownJid?.includes("@")) return knownJid;
  if (number.includes("@")) return number;
  // WhatsApp group identifiers contain a significant hyphen, e.g.
  // `595971650095-1632372351@g.us`. Removing non-digits changes the group
  // JID and makes Zapo wait for metadata for a group that does not exist.
  if (group) return `${number.replace(/[^0-9-]/g, "")}@g.us`;
  return `${number.replace(/\D/g, "")}@s.whatsapp.net`;
};
export const removeZapo = async (id: number, logout = false): Promise<void> => {
  const session = sessions.get(id);
  let store = stores.get(id);
  sessions.delete(id);
  stores.delete(id);
  syncContexts.delete(id);
  historyProcessing.delete(id);
  outboundMessageChains.delete(id);
  lastOutboundMessageAt.delete(id);
  for (const key of recipientJidCache.keys()) {
    if (key.startsWith(`${id}:`)) recipientJidCache.delete(key);
  }
  for (const key of recentMessages.keys()) {
    if (key.startsWith(`${id}:`)) {
      recentMessages.delete(key);
      recentMessageKeys.delete(key);
    }
  }

  if (session) {
    if (logout) {
      try {
        // This sends Zapo's server-side "remove companion device" IQ. Do not
        // hide a failure here: clearing our MySQL state after a failed request
        // makes the UI say disconnected while the phone still shows the link.
        // Zapo resolves logout when WhatsApp accepts the IQ. The device is
        // only actually unpaired when the server closes the session with the
        // logout flag, so wait for that definitive event as well.
        const remoteLogout = waitForZapoRemoteLogout(session);
        try {
          await session.logout();
        } catch (err) {
          // The confirmation listener has its own timeout. Consume it when
          // the IQ itself fails so it cannot become an unhandled rejection.
          void remoteLogout.catch(() => undefined);
          throw err;
        }
        await remoteLogout;
        logger.info(
          { whatsappId: id },
          "Zapo companion device unpaired by WhatsApp"
        );
      } catch (err) {
        // Keep the in-memory session available. The caller must receive the
        // failure and must not claim that the device was disconnected.
        sessions.set(id, session);
        if (store) stores.set(id, store);
        logger.error(
          { whatsappId: id, err },
          "Zapo could not unpair the companion device remotely"
        );
        throw err;
      }
    } else {
      await session.disconnect().catch(err => {
        logger.warn({ whatsappId: id, err }, "Could not close Zapo session");
      });
    }
  }

  if (logout && !session) {
    // A local reset must force a fresh QR even if WhatsApp has not yet sent
    // the logout close event. Zapo's credentials live in MySQL, not in the
    // `Whatsapps.session` field used by the WWebJS provider.
    if (!store) store = createZapoStore().mysql;
    const sessionId = sessionIdFor(id);
    const domains = [
      store.stores.auth(sessionId),
      store.stores.signal(sessionId),
      store.stores.preKey(sessionId),
      store.stores.session(sessionId),
      store.stores.identity(sessionId),
      store.stores.senderKey(sessionId),
      store.stores.appState(sessionId),
      store.stores.privacyToken(sessionId),
      store.caches.retry(sessionId),
      store.caches.groupMetadata(sessionId),
      store.caches.deviceList(sessionId),
      store.caches.messageSecret(sessionId)
    ];
    await Promise.all(domains.map((domain: any) => domain.clear()));
    logger.info({ whatsappId: id }, "Zapo credentials cleared for new QR");
  }

  if (store) await store.destroy().catch(() => undefined);
};
const scheduleReconnect = (id: number) => {
  if (reconnecting.has(id)) return;
  reconnecting.add(id);
  setTimeout(async () => {
    reconnecting.delete(id);
    const whatsapp = await Whatsapp.findByPk(id);
    if (whatsapp?.provider === "zapo")
      initZapo(whatsapp).catch(err =>
        logger.error({ id, err }, "Could not reconnect Zapo")
      );
  }, 2000);
};
export const initZapo = async (whatsapp: Whatsapp): Promise<ZapoSession> => {
  const existing = sessions.get(whatsapp.id);
  if (existing) return existing;
  const { mysql, store } = createZapoStore();
  try {
    await ensureZapoMysqlMigrations(mysql);
    // Zapo credentials are durable in MySQL. Restore the linked phone number
    // before connecting so a temporary disconnect never makes the connection
    // look like a brand-new, unlinked QR session in the UI.
    const persistedCredentials = await mysql.stores
      .auth(sessionIdFor(whatsapp.id))
      .load();
    const persistedNumber = persistedCredentials?.meJid
      ?.split(":")[0]
      .split("@")[0];
    if (persistedNumber) {
      if (whatsapp.number !== persistedNumber) {
        await whatsapp.update({ number: persistedNumber });
      }
      logger.info(
        { whatsappId: whatsapp.id, number: persistedNumber },
        "Restoring persisted Zapo authentication"
      );
    }
  } catch (err) {
    await mysql.destroy().catch(() => undefined);
    throw err;
  }
  const session = new zapo.WaClient(
    {
      store,
      sessionId: sessionIdFor(whatsapp.id),
      // Besides the mailbox bootstrap, history sync carries the NCT salt and
      // trusted-contact tokens required by WhatsApp's privacy-gated sends.
      // Disabling it makes otherwise valid direct sends fail with ACK 463.
      history: { enabled: true },
      // Chat-state hints are only useful while the linked client is online.
      // Match a focused WhatsApp Web client instead of the headless default.
      markOnlineOnConnect: true,
      // Zapo uploads media without this processor, but WhatsApp clients need
      // the generated probe/waveform/Opus normalization metadata for reliable
      // audio and voice-note rendering.
      media: {
        processor: mediaProcessor,
        generateThumbnail: true,
        generateProbe: true,
        generateWaveform: true,
        normalizeVoiceNote: true
      }
    },
    zapo.createNoopLogger("error")
  ) as ZapoSession;
  session.id = whatsapp.id;
  sessions.set(whatsapp.id, session);
  stores.set(whatsapp.id, mysql);
  mysql.startCleanup(sessionIdFor(whatsapp.id));
  session.on("auth_qr", async ({ qr }: any) => {
    await whatsapp.update({
      status: "qrcode",
      qrcode: qr,
      retries: 0
    });
    emitSession(whatsapp);
    await sendConnectionUpdateWebhook(whatsapp.id, { status: "qrcode" });
  });
  session.on("connection", async (event: any) => {
    if (event.status === "open") {
      const number = (session.getCredentials()?.meJid || "")
        .split(":")[0]
        .split("@")[0];
      await whatsapp.update({
        status: "CONNECTED",
        qrcode: "",
        retries: 0,
        number
      });
      await session.presence.send("available").catch(err =>
        logger.warn({ whatsappId: whatsapp.id, err }, "Could not announce Zapo presence")
      );
      emitSession(whatsapp);
      await sendConnectionUpdateWebhook(whatsapp.id, {
        status: "CONNECTED",
        number
      });
      logger.info({ whatsappId: whatsapp.id, number }, "Zapo session ready");
    } else {
      sessions.delete(whatsapp.id);
      const mysqlStore = stores.get(whatsapp.id);
      stores.delete(whatsapp.id);
      if (mysqlStore) await mysqlStore.destroy().catch(() => undefined);
      if (event.isLogout) {
        await whatsapp.update({
          status: "DISCONNECTED",
          qrcode: ""
        });
        emitSession(whatsapp);
        await sendConnectionUpdateWebhook(whatsapp.id, {
          status: "DISCONNECTED",
          isLogout: true
        });
      } else {
        await sendConnectionUpdateWebhook(whatsapp.id, {
          status: "RECONNECTING",
          reason: event.reason || null
        });
        scheduleReconnect(whatsapp.id);
      }
    }
  });
  session.on("message", event =>
    handleZapoMessage(session, whatsapp, event as any).catch(err =>
      logger.error(
        { whatsappId: whatsapp.id, err },
        "Error handling Zapo message"
      )
    )
  );
  // Zapo emits this only after persisting a trusted-contact token. That is the
  // authoritative signal to re-enable recipients blocked by NACK 463.
  session.on("debug_privacy_token", event => {
    if (!event?.jid) return;
    unblockZapoRecipientByJid(whatsapp.id, event.jid).catch(err =>
      logger.warn(
        { whatsappId: whatsapp.id, remoteJid: event.jid, err },
        "Could not unblock Zapo recipient after receiving privacy token"
      )
    );
  });
  session.on("history_sync_chunk", event =>
    queueZapoHistoryProcessing(whatsapp)
      .then(processed =>
        logger.info(
          {
            whatsappId: whatsapp.id,
            messagesInChunk: event.messagesCount,
            processed,
            progress: event.progress
          },
          "Zapo history sync chunk processed"
        )
      )
      .catch(err =>
        logger.error(
          { whatsappId: whatsapp.id, err },
          "Could not process Zapo history sync chunk"
        )
      )
  );
  session.on("message_addon", event => {
    if (event.kind === "reaction") {
      const reaction = event.decrypted?.reaction;
      const senderId = event.key?.participant || event.key?.remoteJid || "";
      if (!reaction || !event.targetMessageId || !senderId) return;
      HandleMessageReactionService({
        reactionData: {
          messageId: event.targetMessageId,
          emoji: reaction.text || "",
          senderId,
          fromMe: Boolean(event.key?.fromMe)
        }
      }).catch(err =>
        logger.warn({ whatsappId: whatsapp.id, err }, "Could not process Zapo reaction")
      );
      return;
    }

    if (event.kind === "message_edit" && event.targetMessageId) {
      const newBody = messageText(event.decrypted?.message);
      if (!newBody) {
        logger.warn(
          { whatsappId: whatsapp.id, targetId: event.targetMessageId },
          "Ignoring Zapo addon edit without text content"
        );
        return;
      }

      HandleMessageEditService({
        messageId: event.targetMessageId,
        newBody,
        fromMe: Boolean(event.key?.fromMe)
      }).catch(err =>
        logger.warn({ whatsappId: whatsapp.id, err }, "Could not process Zapo edit")
      );
    }
  });
  session.on("message_protocol", event => {
    const protocolMessage = event.protocolMessage;
    const targetId = protocolMessage?.key?.id;
    if (!targetId) return;

    const editType = zapo.proto.Message.ProtocolMessage.Type.MESSAGE_EDIT;
    if (protocolMessage?.type === editType) {
      const newBody = messageText(protocolMessage);
      if (!newBody) {
        logger.warn(
          { whatsappId: whatsapp.id, targetId },
          "Ignoring Zapo protocol edit without text content"
        );
        return;
      }

      HandleMessageEditService({
        messageId: targetId,
        newBody,
        fromMe: Boolean(event.key?.fromMe)
      }).catch(err =>
        logger.warn({ whatsappId: whatsapp.id, err, targetId }, "Could not process Zapo protocol edit")
      );
      return;
    }

    const revokeType = zapo.proto.Message.ProtocolMessage.Type.REVOKE;
    if (protocolMessage?.type !== revokeType) return;
    Message.findByPk(targetId)
      .then(async message => {
        if (!message || message.isDeleted) return;
        await message.update({ isDeleted: true, body: "" });
        getIO()
          .to(message.ticketId.toString())
          .emit("appMessage", { action: "update", message });
      })
      .catch(err =>
        logger.warn({ whatsappId: whatsapp.id, err }, "Could not process Zapo revoke")
      );
  });
  session.on("receipt", event => {
    logger.info(
      {
        whatsappId: whatsapp.id,
        status: event.status,
        messageIds: event.messageIds,
        recipientJid: event.recipientJid
      },
      "Zapo outbound receipt received"
    );
    const ackByStatus: Record<string, number> = {
      delivered: 2,
      read: 3,
      played: 4
    };
    const ack = ackByStatus[event.status];
    if (!ack) return;

    Promise.all(
      (event.messageIds || []).map(async (id: string) => {
        const message = await Message.findByPk(id);
        if (!message || ack <= message.ack) return;
        await message.update({ ack });
        getIO()
          .to(message.ticketId.toString())
          .emit("appMessage", { action: "update", message });
        await sendMessageAckWebhook(whatsapp.id, {
          messageId: message.id,
          ticketId: message.ticketId,
          ack,
          status: event.status
        });
      })
    ).catch(err =>
      logger.warn({ whatsappId: whatsapp.id, err }, "Could not process Zapo receipt")
    );
  });
  session
    .connect()
    .catch(err =>
      logger.error(
        { whatsappId: whatsapp.id, err },
        "Zapo initial connection failed"
      )
    );
  return session;
};
