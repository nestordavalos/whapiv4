import Message from "../../models/Message";
import Whatsapp from "../../models/Whatsapp";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import { getStorageService } from "../StorageServices/StorageService";
import { logger } from "../../utils/logger";
import { cacheZapoMessage, getZapoSyncContext } from "../../libs/zapo";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import SendWhatsAppMessage from "./SendWhatsAppMessage";
import SendWhatsAppMediaFromUrl from "./SendWhatsAppMediaFromUrl";
import formatBody from "../../helpers/Mustache";
import { secondsFromDate, timeStringToSeconds } from "../../helpers/workHours";
import HandleMessageReactionService from "../MessageServices/HandleMessageReactionService";
import typebotListener from "../TypebotServices/typebotListener";
import ShowQueueIntegrationService from "../QueueIntegrationServices/ShowQueueIntegrationService";
import ShowQueueService from "../QueueService/ShowQueueService";
import { sayZapoChatbot } from "./zapoChatbotListener";
import {
  sendMessageReceivedWebhook,
  sendMessageSentWebhook
} from "../WebhookService/SendWebhookEvent";

const jidUser = (jid?: string) => (jid || "").split("@")[0].split(":")[0];

const mediaExtension = (mimeType?: string) =>
  mimeType?.split("/")[1]?.split(";")[0] || "bin";

const unwrapMessage = (message: any): any => {
  let content = message || {};
  while (content) {
    const nested =
      content.ephemeralMessage?.message ||
      content.viewOnceMessage?.message ||
      content.viewOnceMessageV2?.message ||
      content.viewOnceMessageV2Extension?.message ||
      content.documentWithCaptionMessage?.message;
    if (!nested) return content;
    content = nested;
  }
  return {};
};

const persistMedia = async (
  session: any,
  event: any,
  data: any,
  mediaType: string
): Promise<string> => {
  // History records are rehydrated as a plain protobuf message, while live
  // events carry transport metadata. Passing the payload itself supports both
  // forms and keeps historical image/audio/video/document downloads working.
  const bytes = await session.message.downloadBytes(event.message || event, {
    maxBytes: 50 * 1024 * 1024
  });
  const filename =
    data?.fileName ||
    `${Date.now()}-${event.key.id}.${mediaExtension(data?.mimetype)}`;
  await getStorageService().uploadBase64(
    Buffer.from(bytes).toString("base64"),
    filename,
    data?.mimetype || `${mediaType}/octet-stream`
  );
  return filename;
};

// Zapo may emit several messages for one contact concurrently while the
// multi-device mailbox is being synchronized. The Contact number is globally
// unique in this application, so serialize just this small critical section.
const pendingContacts = new Map<string, Promise<any>>();
const pendingChats = new Map<string, Promise<void>>();

const findOrCreateContact = (data: any): Promise<any> => {
  const pending = pendingContacts.get(data.number);
  if (pending) return pending;

  const request = CreateOrUpdateContactService(data).finally(() => {
    pendingContacts.delete(data.number);
  });
  pendingContacts.set(data.number, request);
  return request;
};

const isQueueOpen = (queue: any): boolean => {
  if (!queue.startWork || !queue.endWork) return true;
  const start = timeStringToSeconds(queue.startWork);
  const end = timeStringToSeconds(queue.endWork);
  if (start === null || end === null) return true;
  const now = secondsFromDate(new Date());
  return start <= end ? now >= start && now <= end : now >= start || now <= end;
};

const sendZapoQueueText = async (ticket: any, body: string): Promise<void> => {
  await SendWhatsAppMessage({ body: formatBody(`\u200e${body}`, ticket), ticket });
};

const runZapoTypebot = async (
  ticket: any,
  integrationId: number,
  body: string
): Promise<void> => {
  const integration = await ShowQueueIntegrationService(integrationId);
  if (integration.type !== "typebot") return;
  await typebotListener({
    ticket,
    typebot: integration,
    channel: {
      number: ticket.contact.number,
      name: ticket.contact.name,
      body,
      sendText: async text => {
        await SendWhatsAppMessage({ body: text, ticket });
      },
      sendMedia: async (type, url, caption) => {
        await SendWhatsAppMediaFromUrl({
          mediaUrl: url,
          ticket,
          body: caption,
          filename: undefined,
          voiceNote: type === "audio"
        });
      }
    }
  });
};

const queueOptionsText = (whatsapp: any): string => {
  const options = (whatsapp.queues || [])
    .map((queue: any, index: number) => {
      const hours =
        whatsapp.isDisplay && queue.startWork && queue.endWork
          ? ` das ${queue.startWork} as ${queue.endWork}`
          : "";
      return `🔹 *${index + 1}* - ${queue.name}${hours}`;
    })
    .join("\n");
  return `${whatsapp.greetingMessage || ""}\n\n${options}`.trim();
};

const runZapoQueue = async (
  ticket: any,
  body: string
): Promise<boolean> => {
  const whatsapp = await ShowWhatsAppService(ticket.whatsappId);
  const queues: any[] = whatsapp.queues || [];
  if (queues.length === 0) return false;

  if (body === "#" && ticket.queueId && !ticket.userId) {
    await UpdateTicketService({
      ticketData: {
        queueId: null,
        userId: null,
        status: "pending",
        useIntegration: false,
        integrationId: null,
        typebotSessionId: null,
        typebotStatus: false
      },
      ticketId: ticket.id
    });
    await sendZapoQueueText(ticket, queueOptionsText(whatsapp));
    return true;
  }

  if (ticket.queueId || ticket.userId) return false;
  const selected =
    queues.length === 1 ? queues[0] : queues[Number(body.trim()) - 1];
  if (!selected) {
    await sendZapoQueueText(ticket, queueOptionsText(whatsapp));
    return true;
  }

  // Hours apply to every queue behaviour, including Typebot. The web.js
  // provider makes this check before activating an integration as well.
  if (!isQueueOpen(selected)) {
    await UpdateTicketService({
      ticketData: { queueId: selected.id },
      ticketId: ticket.id
    });
    if (selected.absenceMessage) await sendZapoQueueText(ticket, selected.absenceMessage);
    return true;
  }

  const integration = selected.integrationId
    ? await ShowQueueIntegrationService(selected.integrationId)
    : undefined;
  const hasTypebotIntegration = integration?.type === "typebot";
  if (selected.integrationId && !hasTypebotIntegration) {
    logger.warn(
      { whatsappId: whatsapp.id, queueId: selected.id, type: integration?.type },
      "Zapo queue integration is not supported; continuing with the queue flow"
    );
  }
  await UpdateTicketService({
    ticketData: {
      queueId: selected.id,
      ...(hasTypebotIntegration
        ? { useIntegration: true, integrationId: selected.integrationId }
        : { useIntegration: false, integrationId: null })
    },
    ticketId: ticket.id
  });
  if (hasTypebotIntegration) {
    await ticket.reload({ include: ["contact"] });
    await runZapoTypebot(ticket, selected.integrationId, body);
    return true;
  }
  const chatbotOptions = (selected.chatbots || [])
    .map((chatbot: any, index: number) => `🔹 *${index + 1}* - ${chatbot.name}`)
    .join("\n");
  if (selected.greetingMessage || chatbotOptions) {
    await sendZapoQueueText(
      ticket,
      `${selected.greetingMessage || ""}\n\n${chatbotOptions}${
        chatbotOptions || selected.greetingMessage
          ? "\n\n*#* *Para volver al menu principal*"
          : ""
      }`
    );
  }
  return true;
};

const handleZapoMessageNow = async (
  _session: any,
  whatsapp: Whatsapp,
  event: any
): Promise<void> => {
  const { key } = event;
  if (!key?.id || !key.remoteJid || key.remoteJid === "status@broadcast")
    return;
  const rawContent = unwrapMessage(event.message);
  const reaction = rawContent.reactionMessage;
  if (reaction?.key?.id) {
    await HandleMessageReactionService({
      reactionData: {
        messageId: reaction.key.id,
        emoji: reaction.text || "",
        senderId: key.participant || key.remoteJid,
        fromMe: Boolean(key.fromMe)
      }
    });
    return;
  }
  if (await Message.findByPk(key.id)) return;
  if (event.message) cacheZapoMessage(whatsapp.id, key.id, event.message);
  if (key.isGroup || key.remoteJid.endsWith("@g.us")) return;
  const current = await Whatsapp.findByPk(whatsapp.id);
  if (current?.provider !== "zapo" || current.status !== "CONNECTED") return;
  const { remoteJid } = key;
  const number = jidUser(key.remoteJidAlt || remoteJid);
  if (!number) return;
  const fromMe = Boolean(key.fromMe);
  const ownNumber = (current.number || "").replace(/\D/g, "");
  const messageTimestamp = Number(event.timestampSeconds || Date.now() / 1000);
  const syncContext = getZapoSyncContext(whatsapp.id, remoteJid);

  // History responses share the live-message event. Apply inbox limits only
  // to a chat explicitly requested by the current synchronization.
  if (
    !fromMe &&
    syncContext &&
    messageTimestamp * 1000 < Date.now() - syncContext.maxMessageAgeHours * 3600000
  ) {
    logger.debug(
      { whatsappId: whatsapp.id, messageId: key.id, messageTimestamp },
      "Skipping Zapo message older than the inbox synchronization limit"
    );
    return;
  }

  // WhatsApp also synchronizes messages sent to the same connected account.
  // They are not customer conversations and used to race when creating the
  // contact for the account's own number.
  if (fromMe && ownNumber && number === ownNumber) return;

  const content = rawContent;
  const mediaData =
    content.imageMessage ||
    content.videoMessage ||
    content.audioMessage ||
    content.documentMessage ||
    content.stickerMessage;
  const locationData = content.locationMessage || content.liveLocationMessage;
  const latitude = Number(locationData?.degreesLatitude);
  const longitude = Number(locationData?.degreesLongitude);
  const hasLocation =
    Boolean(locationData) && Number.isFinite(latitude) && Number.isFinite(longitude);
  const isLiveLocation = hasLocation && Boolean(locationData?.isLive);
  const locationLink = hasLocation
    ? `https://maps.google.com/maps?q=${latitude}%2C${longitude}&z=17`
    : "";
  const locationDescription = hasLocation
    ? `${isLiveLocation ? "📡 Ubicación en vivo" : "📍 Ubicación"}\n${
        locationData?.name || locationData?.address || `${latitude}, ${longitude}`
      }`
    : "";
  const locationThumbnail = locationData?.jpegThumbnail
    ? `data:image/jpeg;base64,${Buffer.from(locationData.jpegThumbnail).toString("base64")}`
    : "";
  const body =
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    (hasLocation ? `${locationThumbnail}|${locationLink}|${locationDescription}` : "") ||
    "";
  const mediaType = hasLocation
    ? "location"
    : content.imageMessage
    ? "image"
    : content.videoMessage
    ? "video"
    : content.audioMessage
    ? "audio"
    : content.documentMessage
    ? content.documentMessage.mimetype?.startsWith("image/")
      ? "image"
      : "document"
    : content.stickerMessage
    ? "sticker"
    : "chat";
  const contextInfo =
    content.extendedTextMessage?.contextInfo || mediaData?.contextInfo;
  const quotedCandidateId = contextInfo?.stanzaId;
  const quotedMsgId = quotedCandidateId
    ? (await Message.findByPk(quotedCandidateId))?.id
    : undefined;
  let profilePicUrl = "/default-profile.png";
  try {
    const picture = await _session.profile.getProfilePicture(remoteJid, "image");
    profilePicUrl = picture?.url || profilePicUrl;
  } catch (err) {
    logger.debug(
      { whatsappId: whatsapp.id, remoteJid, err },
      "Could not fetch Zapo contact profile picture"
    );
  }
  const contact = await findOrCreateContact({
    name: event.pushName || number,
    number,
    isGroup: false,
    remoteJid,
    profilePicUrl,
    whatsappId: whatsapp.id
  });
  const ticket = await FindOrCreateTicketService(
    contact,
    whatsapp.id,
    fromMe ? 0 : 1,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      createAsClosed: Boolean(
        !fromMe &&
          syncContext?.createClosedForRead &&
          syncContext.mode === "all" &&
          syncContext.unreadCount === 0
      )
    }
  );
  let mediaUrl: string | undefined;
  if (mediaData) {
    try {
      mediaUrl = await persistMedia(_session, event, mediaData, mediaType);
    } catch (err) {
      logger.warn(
        { whatsappId: whatsapp.id, messageId: key.id, err },
        "Could not download Zapo media"
      );
    }
  }

  await CreateMessageService({
    messageData: {
      id: key.id,
      ticketId: ticket.id,
      contactId: fromMe ? undefined : contact.id,
      body,
      fromMe,
      read: fromMe,
      mediaType,
      mediaUrl,
      quotedMsgId,
      ack: fromMe ? 1 : 0,
      createdAt: new Date(messageTimestamp * 1000),
      updatedAt: new Date()
    }
  });

  const webhookMessageData = {
    messageId: key.id,
    body,
    fromMe,
    mediaType,
    hasMedia: Boolean(mediaData),
    timestamp: Number(event.timestampSeconds || Date.now() / 1000),
    ticketId: ticket.id,
    contact: { id: contact.id, name: contact.name, number: contact.number },
    media: mediaData
      ? {
          url: mediaUrl || null,
          mimeType: mediaData.mimetype || null,
          type: mediaType
        }
      : null,
    location: hasLocation
      ? { latitude, longitude, isLive: isLiveLocation, url: locationLink }
      : null
  };
  // A local history import must populate the inbox only. Re-emitting past
  // messages to automations/webhooks or queues would replay old workflows.
  if (!event.historySync) {
    if (fromMe) {
      await sendMessageSentWebhook(whatsapp.id, webhookMessageData);
    } else {
      await sendMessageReceivedWebhook(whatsapp.id, webhookMessageData);
    }
  }

  if (!fromMe && syncContext?.markAsSeen) {
    try {
      await _session.message.sendReceipt(event, { type: "read" });
    } catch (err) {
      logger.warn(
        { whatsappId: whatsapp.id, messageId: key.id, err },
        "Could not mark synchronized Zapo message as read"
      );
    }
  }

  if (!fromMe && !event.historySync) {
    try {
      await ticket.reload({ include: ["contact"] });
      // This must run before an active integration. Otherwise `#` is sent to
      // the old Typebot forever and the customer can never return to queues.
      if (
        body === "#" &&
        ticket.queueId &&
        !ticket.userId &&
        ticket.useIntegration
      ) {
        await runZapoQueue(ticket, body);
        return;
      }
      if (ticket.useIntegration && ticket.integrationId) {
        await runZapoTypebot(ticket, ticket.integrationId, body);
        return;
      }
      if (ticket.queueId && !ticket.userId) {
        const queue = await ShowQueueService(ticket.queueId);
        if (queue.chatbots?.length) {
          await sayZapoChatbot(ticket.queueId, ticket, ticket.contact, body);
          return;
        }
      }
      await runZapoQueue(ticket, body);
    } catch (err) {
      logger.error(
        { whatsappId: whatsapp.id, ticketId: ticket.id, err },
        "Could not process Zapo queue"
      );
    }
  }
};

// A history chunk may contain several messages for the same thread and more
// than one chunk can arrive at once. Ticket creation is a read-then-create
// operation, so serialize one chat at a time to prevent duplicate tickets.
export const handleZapoMessage = async (
  session: any,
  whatsapp: Whatsapp,
  event: any
): Promise<void> => {
  const key = `${whatsapp.id}:${event?.key?.remoteJid || "unknown"}`;
  const previous = pendingChats.get(key) || Promise.resolve();
  const current = previous
    .catch(() => undefined)
    .then(() => handleZapoMessageNow(session, whatsapp, event));
  pendingChats.set(key, current);
  try {
    await current;
  } finally {
    if (pendingChats.get(key) === current) pendingChats.delete(key);
  }
};
