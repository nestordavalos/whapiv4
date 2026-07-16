import type {
  proto,
  WASocket,
  WAMessage,
  BaileysEventMap
} from "@whiskeysockets/baileys";
import Message from "../../models/Message";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import { getStorageService } from "../StorageServices/StorageService";
import { logger } from "../../utils/logger";
import {
  cacheLidPhoneMapping,
  getCachedPhoneFromLid
} from "../../helpers/GetContactJid";
import { getIO } from "../../libs/socket";
import { loadBaileys } from "../../libs/baileys";

const unwrapMessage = (message: proto.IMessage | null | undefined) => {
  let content = message;
  while (content) {
    // The primary phone can send its message inside a linked-device envelope.
    // Its context metadata is not the message content.
    const nextContent =
      content.ephemeralMessage?.message ||
      (content as any).deviceSentMessage?.message ||
      (content as any).viewOnceMessage?.message ||
      (content as any).viewOnceMessageV2?.message ||
      (content as any).viewOnceMessageV2Extension?.message;
    if (!nextContent) break;
    content = nextContent;
  }
  return content || {};
};

const getMessageInfo = (message: WAMessage) => {
  const content = unwrapMessage(message.message);
  const entries = Object.entries(content).find(
    ([key, value]) => key !== "messageContextInfo" && Boolean(value)
  );
  const kind = entries?.[0] || "conversation";
  const value = entries?.[1] as any;
  const media =
    /Message$/.test(kind) &&
    [
      "imageMessage",
      "videoMessage",
      "audioMessage",
      "documentMessage",
      "stickerMessage"
    ].includes(kind);
  const body =
    content.conversation ||
    content.extendedTextMessage?.text ||
    value?.caption ||
    value?.text ||
    "";
  const contextInfo =
    content.extendedTextMessage?.contextInfo || value?.contextInfo;

  return {
    body,
    contextInfo,
    media,
    mediaType: kind.replace(/Message$/, "") || "chat",
    mediaData: value
  };
};

const jidUser = (jid?: string | null) =>
  (jid || "").split("@")[0].split(":")[0];

const keyPhoneJid = (message: WAMessage): string | undefined => {
  const key = message.key as any;
  return key.senderPn || key.recipientPn || key.remoteJidAlt;
};

const mediaExtension = (mimeType?: string) => {
  const subtype = mimeType?.split("/")[1]?.split(";")[0];
  return subtype || "bin";
};

const inFlightMessageIds = new Set<string>();

const getProfilePictureWithTimeout = async (
  socket: WASocket,
  jid: string
): Promise<string> => {
  const fallback = "/default-profile.png";
  try {
    return (
      (await Promise.race([
        socket.profilePictureUrl(jid, "image"),
        new Promise<undefined>(resolve =>
          setTimeout(() => resolve(undefined), 5000)
        )
      ])) || fallback
    );
  } catch {
    return fallback;
  }
};

const persistMedia = async (
  socket: WASocket,
  message: WAMessage,
  mediaType: string,
  mediaData: any
): Promise<string | undefined> => {
  const { downloadMediaMessage } = await loadBaileys();
  const buffer = (await downloadMediaMessage(
    message,
    "buffer",
    {},
    {
      reuploadRequest: socket.updateMediaMessage as any,
      logger: socket.logger
    }
  )) as Buffer;
  const filename = `${Date.now()}-${message.key.id}.${mediaExtension(
    mediaData?.mimetype
  )}`;
  await getStorageService().uploadBase64(
    buffer.toString("base64"),
    filename,
    mediaData?.mimetype || `${mediaType}/octet-stream`
  );
  return filename;
};

const handleMessage = async (
  socket: WASocket,
  whatsapp: Whatsapp,
  message: WAMessage
): Promise<void> => {
  const { id } = message.key;
  const { remoteJid } = message.key;
  if (!id || !remoteJid || remoteJid === "status@broadcast") return;
  logger.info(
    {
      whatsappId: whatsapp.id,
      messageId: id,
      remoteJid,
      fromMe: Boolean(message.key.fromMe),
      senderPn: (message.key as any).senderPn || message.key.remoteJidAlt,
      recipientPn: (message.key as any).recipientPn || message.key.remoteJidAlt,
      participant: message.key.participant
    },
    "Whaileys messages.upsert received"
  );
  if (await Message.findByPk(id)) return;

  const info = getMessageInfo(message);
  if (
    [
      "senderKeyDistribution",
      "protocol",
      "reaction",
      "pollUpdate",
      "messageContextInfo"
    ].includes(info.mediaType)
  ) {
    logger.info(
      {
        whatsappId: whatsapp.id,
        messageId: id,
        fromMe: Boolean(message.key.fromMe),
        mediaType: info.mediaType,
        messageKeys: Object.keys(unwrapMessage(message.message))
      },
      "Ignoring Whaileys technical message"
    );
    return;
  }

  const isGroup = remoteJid.endsWith("@g.us");
  // Group traffic must never enter the ticket pipeline for this provider.
  // The generic WhatsApp setting is intentionally not used here: Whaileys
  // group support has not been implemented or validated yet.
  if (isGroup) {
    logger.info(
      { whatsappId: whatsapp.id, messageId: id, remoteJid },
      "Ignoring Whaileys group message"
    );
    return;
  }

  // If a session was disconnected/deleted while a buffered event was being
  // processed, do not create contacts, tickets or messages for it.
  const activeWhatsapp = await Whatsapp.findByPk(whatsapp.id);
  if (
    !activeWhatsapp ||
    activeWhatsapp.provider !== "whaileys" ||
    activeWhatsapp.status !== "CONNECTED"
  ) {
    logger.debug(
      { whatsappId: whatsapp.id, messageId: id },
      "Ignoring message from inactive Whaileys session"
    );
    return;
  }

  const fromMe = Boolean(message.key.fromMe);
  const contactJid = isGroup
    ? remoteJid
    : fromMe
    ? remoteJid
    : message.key.participant || remoteJid;
  const phoneJid = isGroup ? undefined : keyPhoneJid(message);
  if (phoneJid && contactJid.endsWith("@lid")) {
    cacheLidPhoneMapping(contactJid, phoneJid);
  }
  const number = jidUser(
    phoneJid || getCachedPhoneFromLid(contactJid) || contactJid
  );
  if (!number) return;

  const profilePicUrl = await getProfilePictureWithTimeout(
    socket,
    phoneJid || contactJid
  );

  const contact = await CreateOrUpdateContactService({
    name: message.pushName || number,
    number,
    isGroup,
    remoteJid: contactJid,
    profilePicUrl,
    whatsappId: whatsapp.id
  });
  if (phoneJid && contactJid.endsWith("@lid")) {
    const lidContact = await Contact.findOne({
      where: { number: jidUser(contactJid), isGroup: false }
    });
    if (lidContact && lidContact.id !== contact.id) {
      await Ticket.update(
        { contactId: contact.id },
        { where: { contactId: lidContact.id } }
      );
      await lidContact.destroy();
      getIO().emit("contact", { action: "delete", contactId: lidContact.id });
    }
  }
  const ticket = await FindOrCreateTicketService(
    contact,
    whatsapp.id,
    fromMe ? 0 : 1
  );
  logger.info(
    {
      whatsappId: whatsapp.id,
      messageId: id,
      fromMe,
      mediaType: info.mediaType,
      isGroup
    },
    "Whaileys message received"
  );
  const quotedCandidateId = info.contextInfo?.stanzaId;
  const quotedMsgId = quotedCandidateId
    ? (await Message.findByPk(quotedCandidateId))?.id
    : undefined;
  let mediaUrl: string | undefined;

  if (info.media) {
    try {
      mediaUrl = await persistMedia(
        socket,
        message,
        info.mediaType,
        info.mediaData
      );
    } catch (err) {
      logger.warn(
        { whatsappId: whatsapp.id, id, err },
        "Could not download Whaileys media"
      );
    }
  }

  await CreateMessageService({
    messageData: {
      id,
      ticketId: ticket.id,
      contactId: fromMe ? undefined : contact.id,
      body: info.body,
      fromMe,
      read: fromMe,
      mediaType: info.mediaType,
      mediaUrl,
      quotedMsgId,
      ack: 0,
      createdAt: new Date(
        Number(message.messageTimestamp || Date.now() / 1000) * 1000
      ),
      updatedAt: new Date()
    }
  });

  await ticket.update({
    fromMe,
    isMsgGroup: isGroup,
    lastMessage: info.body || (info.media ? `[${info.mediaType}]` : "")
  });
};

export const handleWhaileysMessagesUpsert = async (
  socket: WASocket,
  whatsapp: Whatsapp,
  upsert: BaileysEventMap["messages.upsert"]
): Promise<void> => {
  logger.info(
    {
      whatsappId: whatsapp.id,
      upsertType: upsert.type,
      messageCount: upsert.messages.length
    },
    "Whaileys messages.upsert event"
  );
  await Promise.all(
    upsert.messages.map(async message => {
      const messageId = message.key.id;
      if (!messageId || inFlightMessageIds.has(messageId)) return;
      inFlightMessageIds.add(messageId);
      try {
        await handleMessage(socket, whatsapp, message);
      } finally {
        inFlightMessageIds.delete(messageId);
      }
    })
  );
};
