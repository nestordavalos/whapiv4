import * as Sentry from "@sentry/node";
import { isNull } from "lodash";
import moment from "moment";

import {
  Contact as WbotContact,
  Message as WbotMessage,
  MessageAck,
  Client,
  Reaction
} from "whatsapp-web.js";

import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import Settings from "../../models/Setting";
import Queue from "../../models/Queue";

import { getIO } from "../../libs/socket";
import CreateMessageService from "../MessageServices/CreateMessageService";
import HandleMessageReactionService from "../MessageServices/HandleMessageReactionService";
import HandleMessageEditService from "../MessageServices/HandleMessageEditService";
import { logger } from "../../utils/logger";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import ListSettingsServiceOne from "../SettingServices/ListSettingsServiceOne";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import ShowWhatsaAppHours from "../WhatsappService/ShowWhatsaAppHours";

import { debounce } from "../../helpers/Debounce";
import {
  buildDaySchedule,
  evaluateSchedule,
  secondsFromDate,
  timeStringToSeconds
} from "../../helpers/workHours";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import CreateContactService from "../ContactServices/CreateContactService";
import formatBody from "../../helpers/Mustache";
import { sayChatbot } from "./ChatBotListener";
import UserRating from "../../models/UserRating";
import TicketTraking from "../../models/TicketTraking";
import SendWhatsAppMessage from "./SendWhatsAppMessage";
import FindOrCreateATicketTrakingService from "../TicketServices/FindOrCreateATicketTrakingService";
import {
  sendMessageReceivedWebhook,
  sendMessageSentWebhook,
  sendMessageAckWebhook
} from "../WebhookService/SendWebhookEvent";
import typebotListener from "../TypebotServices/typebotListener";
import ShowQueueIntegrationService from "../QueueIntegrationServices/ShowQueueIntegrationService";
import { getStorageService } from "../StorageServices/StorageService";

interface Session extends Client {
  id?: number;
}

const verifyContact = async (msgContact: WbotContact): Promise<Contact> => {
  try {
    const profilePicUrl = await msgContact.getProfilePicUrl();
    const contactData = {
      name: msgContact.name || msgContact.pushname || msgContact.id.user,
      number: msgContact.id.user,
      profilePicUrl,
      isGroup: msgContact.isGroup
    };
    const contact = CreateOrUpdateContactService(contactData);
    return contact;
  } catch (err) {
    const profilePicUrl = "/default-profile.png"; // Foto de perfil padrão
    const contactData = {
      name: msgContact.name || msgContact.pushname || msgContact.id.user,
      number: msgContact.id.user,
      profilePicUrl,
      isGroup: msgContact.isGroup
    };
    const contact = CreateOrUpdateContactService(contactData);
    return contact;
  }
};

export const verifyQuotedMessage = async (
  msg: WbotMessage
): Promise<Message | null> => {
  if (!msg.hasQuotedMsg) return null;

  const wbotQuotedMsg = await msg.getQuotedMessage();

  const quotedMsg = await Message.findOne({
    where: { id: wbotQuotedMsg.id.id }
  });

  if (!quotedMsg) return null;

  return quotedMsg;
};
const verifyRevoked = async (msgBody?: string): Promise<void> => {
  await new Promise(r => setTimeout(r, 500));

  const io = getIO();

  if (msgBody === undefined) {
    return;
  }

  try {
    const message = await Message.findOne({
      where: {
        body: msgBody
      }
    });

    if (!message) {
      return;
    }

    if (message) {
      // console.log(message);
      await Message.update(
        { isDeleted: true },
        {
          where: { id: message.id }
        }
      );

      const msgIsDeleted = await Message.findOne({
        where: {
          body: msgBody
        }
      });

      if (!msgIsDeleted) {
        return;
      }

      io.to(msgIsDeleted.ticketId.toString()).emit("appMessage", {
        action: "update",
        message: msgIsDeleted
      });
    }
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Error Message Revoke. Err: ${err}`);
  }
};

const verifyMediaMessage = async (
  msg: WbotMessage,
  ticket: Ticket,
  contact: Contact
): Promise<Message> => {
  const quotedMsg = await verifyQuotedMessage(msg);

  const media = await msg.downloadMedia();

  if (!media) {
    throw new Error("ERR_WAPP_DOWNLOAD_MEDIA");
  }

  if (!media.filename) {
    const ext = media.mimetype.split("/")[1].split(";")[0];
    media.filename = `${new Date().getTime()}.${ext}`;
  } else {
    const originalFilename = media.filename ? `-${media.filename}` : "";
    // Always write a random filename
    media.filename = `${new Date().getTime()}${originalFilename}`;
  }

  try {
    // Use StorageService for file upload (supports S3, S3-compatible, and local with fallback)
    const storageService = getStorageService();
    await storageService.uploadBase64(
      media.data,
      media.filename,
      media.mimetype
    );
    logger.debug(`Media uploaded via StorageService: ${media.filename}`);
  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(`Failed to upload media via StorageService: ${err}`);
  }

  let $tipoArquivo: string;

  switch (media.mimetype.split("/")[0]) {
    case "audio":
      $tipoArquivo = "🔉 Mensaje de audio";
      break;

    case "image":
      $tipoArquivo = "🖼️ Archivo de imagen";
      break;

    case "video":
      $tipoArquivo = "🎬 Archivo de vídeo";
      break;

    case "document":
      $tipoArquivo = "📘 Documento";
      break;

    case "application":
      $tipoArquivo = "📎 Documento";
      break;

    case "ciphertext":
      $tipoArquivo = "⚠️ Notificación";
      break;

    case "e2e_notification":
      $tipoArquivo = "⛔ Notificación";
      break;

    case "revoked":
      $tipoArquivo = "❌ Borrado";
      break;
    default:
      $tipoArquivo = "📎 Archivo";
      break;
  }

  let $strBody: string;

  if (msg.fromMe) {
    $strBody = msg.body;
  } else {
    $strBody = msg.body;
  }

  const messageData = {
    id: msg.id.id,
    ticketId: ticket.id,
    contactId: msg.fromMe ? undefined : contact.id,
    body: $strBody,
    fromMe: msg.fromMe,
    read: msg.fromMe,
    mediaUrl: media.filename,
    mediaType: media.mimetype.split("/")[0],
    quotedMsgId: quotedMsg?.id,
    ack: msg.ack,
    createdAt: new Date(msg.timestamp * 1000),
    updatedAt: new Date(msg.timestamp * 1000)
  };

  if (msg.fromMe == true) {
    await ticket.update({
      lastMessage:
        `${"🢅" + "⠀"}${$tipoArquivo}` || `${"🢅" + "⠀"}${$tipoArquivo}`
    });
  } else {
    await ticket.update({
      lastMessage:
        `${"🢇" + "⠀"}${$tipoArquivo}` || `${"🢇" + "⠀"}${$tipoArquivo}`
    });
  }

  const newMessage = await CreateMessageService({ messageData });

  return newMessage;
};

const getLocationDescription = (msg: WbotMessage): string | undefined => {
  const loc: any = msg.location;
  return loc?.options?.address || loc?.options || loc?.description;
};

const prepareLocation = (msg: WbotMessage): WbotMessage => {
  const gmapsUrl = `https://maps.google.com/maps?q=${msg.location.latitude}%2C${msg.location.longitude}&z=17`;
  msg.body = `data:image/png;base64,${msg.body}|${gmapsUrl}`;
  const description = getLocationDescription(msg);
  msg.body += `|${
    description || `${msg.location.latitude}, ${msg.location.longitude}`
  }`;
  return msg;
};

export const verifyMessage = async (
  msg: WbotMessage,
  ticket: Ticket,
  contact: Contact
): Promise<Message> => {
  if (msg.type === "location") msg = prepareLocation(msg);

  const quotedMsg = await verifyQuotedMessage(msg);
  const messageData = {
    id: msg.id.id,
    ticketId: ticket.id,
    contactId: msg.fromMe ? undefined : contact.id,
    body: msg.body,
    fromMe: msg.fromMe,
    mediaType: msg.type,
    read: msg.fromMe,
    quotedMsgId: quotedMsg?.id,
    ack: msg.ack,
    createdAt: new Date(msg.timestamp * 1000),
    updatedAt: new Date(msg.timestamp * 1000)
  };

  if (msg.fromMe == true) {
    await ticket.update({
      // texto que sai do chat tb,
      fromMe: msg.fromMe,
      lastMessage:
        msg.type === "location"
          ? getLocationDescription(msg)
            ? "🢅" +
              "⠀" +
              `Localization - ${
                String(getLocationDescription(msg)).split("\\n")[0]
              }`
            : "🢅" + "⠀" + "🗺️:" + "Localization"
          : `${"🢅" + "⠀"}${msg.body}`
    });
  } else {
    await ticket.update({
      // aqui mapei texto que chega do chat
      lastMessage:
        msg.type === "location"
          ? getLocationDescription(msg)
            ? "🢇" +
              "⠀" +
              "🗺️:" +
              `Localization - ${
                String(getLocationDescription(msg)).split("\\n")[0]
              }`
            : "🢇" + "⠀" + "🗺️:" + "Localization"
          : `${"🢇" + "⠀"}${msg.body}`
    });
  }
  const newMessage = await CreateMessageService({ messageData });
  return newMessage;
};

const verifyQueue = async (
  wbot: Session,
  msg: WbotMessage,
  ticket: Ticket,
  contact: Contact
) => {
  const whatsapp = await ShowWhatsAppService(wbot.id!);
  const queues: Queue[] = whatsapp.queues || [];
  const { greetingMessage, isDisplay } = whatsapp;

  if (queues.length === 0) {
    return;
  }

  const {
    defineWorkHours,
    outOfWorkMessage,
    sunday,
    StartDefineWorkHoursSunday,
    EndDefineWorkHoursSunday,
    StartDefineWorkHoursSundayLunch,
    EndDefineWorkHoursSundayLunch,
    monday,
    StartDefineWorkHoursMonday,
    EndDefineWorkHoursMonday,
    StartDefineWorkHoursMondayLunch,
    EndDefineWorkHoursMondayLunch,
    tuesday,
    StartDefineWorkHoursTuesday,
    EndDefineWorkHoursTuesday,
    StartDefineWorkHoursTuesdayLunch,
    EndDefineWorkHoursTuesdayLunch,
    wednesday,
    StartDefineWorkHoursWednesday,
    EndDefineWorkHoursWednesday,
    StartDefineWorkHoursWednesdayLunch,
    EndDefineWorkHoursWednesdayLunch,
    thursday,
    StartDefineWorkHoursThursday,
    EndDefineWorkHoursThursday,
    StartDefineWorkHoursThursdayLunch,
    EndDefineWorkHoursThursdayLunch,
    friday,
    StartDefineWorkHoursFriday,
    EndDefineWorkHoursFriday,
    StartDefineWorkHoursFridayLunch,
    EndDefineWorkHoursFridayLunch,
    saturday,
    StartDefineWorkHoursSaturday,
    EndDefineWorkHoursSaturday,
    StartDefineWorkHoursSaturdayLunch,
    EndDefineWorkHoursSaturdayLunch
  } = await ShowWhatsaAppHours(wbot.id!);

  const schedules = {
    0: buildDaySchedule(
      sunday,
      StartDefineWorkHoursSunday,
      StartDefineWorkHoursSundayLunch,
      EndDefineWorkHoursSundayLunch,
      EndDefineWorkHoursSunday
    ),
    1: buildDaySchedule(
      monday,
      StartDefineWorkHoursMonday,
      StartDefineWorkHoursMondayLunch,
      EndDefineWorkHoursMondayLunch,
      EndDefineWorkHoursMonday
    ),
    2: buildDaySchedule(
      tuesday,
      StartDefineWorkHoursTuesday,
      StartDefineWorkHoursTuesdayLunch,
      EndDefineWorkHoursTuesdayLunch,
      EndDefineWorkHoursTuesday
    ),
    3: buildDaySchedule(
      wednesday,
      StartDefineWorkHoursWednesday,
      StartDefineWorkHoursWednesdayLunch,
      EndDefineWorkHoursWednesdayLunch,
      EndDefineWorkHoursWednesday
    ),
    4: buildDaySchedule(
      thursday,
      StartDefineWorkHoursThursday,
      StartDefineWorkHoursThursdayLunch,
      EndDefineWorkHoursThursdayLunch,
      EndDefineWorkHoursThursday
    ),
    5: buildDaySchedule(
      friday,
      StartDefineWorkHoursFriday,
      StartDefineWorkHoursFridayLunch,
      EndDefineWorkHoursFridayLunch,
      EndDefineWorkHoursFriday
    ),
    6: buildDaySchedule(
      saturday,
      StartDefineWorkHoursSaturday,
      StartDefineWorkHoursSaturdayLunch,
      EndDefineWorkHoursSaturdayLunch,
      EndDefineWorkHoursSaturday
    )
  };

  const now = new Date();
  const scheduleStatus = evaluateSchedule(now, schedules[now.getDay()]);
  const currentSeconds = secondsFromDate(now);
  const remoteJid = `${contact.number}@${
    ticket.isGroup ? "g.us" : "s.whatsapp.net"
  }`;

  const sendDebouncedText = (body: string) => {
    const debouncedSentMessage = debounce(
      async () => {
        const sentMessage = await wbot.sendMessage(remoteJid, body);
        verifyMessage(sentMessage, ticket, contact);
      },
      3000,
      ticket.id
    );

    debouncedSentMessage();
  };

  const sendOutOfWork = () => {
    if (!outOfWorkMessage || outOfWorkMessage.trim() === "") {
      return;
    }

    const body = formatBody(`\u200e${outOfWorkMessage}`, ticket);
    sendDebouncedText(body);
  };

  if (defineWorkHours) {
    if (!scheduleStatus.enabled || !scheduleStatus.open) {
      sendOutOfWork();
      return;
    }
  }

  const isQueueOperating = (queue: Queue) => {
    if (!queue.startWork || !queue.endWork) {
      return true;
    }

    const start = timeStringToSeconds(queue.startWork);
    const end = timeStringToSeconds(queue.endWork);

    if (start === null || end === null) {
      return true;
    }

    if (start <= end) {
      return currentSeconds >= start && currentSeconds <= end;
    }

    return currentSeconds >= start || currentSeconds <= end;
  };

  const sendQueueAbsence = (queue: Queue) => {
    if (!queue.absenceMessage) {
      return;
    }

    const body = formatBody(`\u200e${queue.absenceMessage}`, ticket);
    sendDebouncedText(body);
  };

  const sendQueueGreeting = async (queue: Queue) => {
    if (
      !queue.greetingMessage &&
      (!queue.chatbots || queue.chatbots.length === 0)
    ) {
      return;
    }

    const chat = await msg.getChat();
    await chat.sendStateTyping();

    if (queue.chatbots && queue.chatbots.length > 0) {
      let options = "";
      queue.chatbots.forEach((chatbot, index) => {
        options += `🔹 *${index + 1}* - ${chatbot.name}\n`;
      });

      const header = queue.greetingMessage || "";
      const body = formatBody(
        `\u200e${header}\n\n${options}\n*#* *Para volver al menu principal*`,
        ticket
      );
      const sentMessage = await wbot.sendMessage(remoteJid, body);
      await verifyMessage(sentMessage, ticket, contact);
      return;
    }

    if (queue.greetingMessage) {
      const body = formatBody(
        `\u200e${queue.greetingMessage}\n\n*#* *Para volver al menu principal*`,
        ticket
      );
      const sentMessage = await wbot.sendMessage(remoteJid, body);
      await verifyMessage(sentMessage, ticket, contact);
    }
  };

  const assignQueue = async (queue: Queue) => {
    // If queue has typebot integration, activate it
    if (queue.integrationId && queue.integration) {
      await UpdateTicketService({
        ticketData: {
          queueId: queue.id,
          useIntegration: true,
          integrationId: queue.integrationId
        },
        ticketId: ticket.id
      });

      // Load full integration data for typebot
      if (queue.integration.type === "typebot") {
        try {
          const fullIntegration = await ShowQueueIntegrationService(
            queue.integrationId
          );
          await typebotListener({
            wbot,
            msg,
            ticket,
            typebot: fullIntegration
          });
        } catch (error) {
          logger.error("Error starting typebot from queue: ", error);
        }
      }
    } else {
      // No integration, just assign queue normally
      await UpdateTicketService({
        ticketData: { queueId: queue.id },
        ticketId: ticket.id
      });
      await sendQueueGreeting(queue);
    }
  };

  const handleSingleQueue = async () => {
    const [queue] = queues;
    if (!queue) {
      return;
    }

    if (isQueueOperating(queue)) {
      await assignQueue(queue);
    } else {
      sendQueueAbsence(queue);
      await UpdateTicketService({
        ticketData: { queueId: queue.id },
        ticketId: ticket.id
      });
    }
  };

  const buildQueueOptions = () => {
    let options = "";

    queues.forEach((queue, index) => {
      const baseOption = `🔹 *${index + 1}* - ${queue.name}`;

      if (queue.startWork && queue.endWork && isDisplay) {
        options += `${baseOption} das ${queue.startWork} as ${queue.endWork}\n`;
      } else {
        options += `${baseOption}\n`;
      }
    });

    return options;
  };

  const sendQueueOptions = async () => {
    const chat = await msg.getChat();
    await chat.sendStateTyping();

    const options = buildQueueOptions();
    const header = greetingMessage || "";
    const body = formatBody(`\u200e${header}\n\n${options}`, ticket);

    sendDebouncedText(body);
  };

  const handleMultipleQueues = async () => {
    const selectedIndex = Number(msg.body) - 1;
    const selectedQueue = queues[selectedIndex];

    if (!selectedQueue) {
      await sendQueueOptions();
      return;
    }

    if (!isQueueOperating(selectedQueue)) {
      sendQueueAbsence(selectedQueue);
      return;
    }

    await assignQueue(selectedQueue);
  };

  if (queues.length === 1) {
    await handleSingleQueue();
    return;
  }

  await handleMultipleQueues();
};

const isValidMsg = (msg: WbotMessage): boolean => {
  if (msg.from === "status@broadcast") return false;
  if (
    msg.type === "chat" ||
    msg.type === "audio" ||
    msg.type === "call_log" ||
    msg.type === "ptt" ||
    msg.type === "video" ||
    msg.type === "image" ||
    msg.type === "document" ||
    msg.type === "vcard" ||
    // msg.type === "multi_vcard" ||
    // msg.type === "sticker" ||
    msg.type === "e2e_notification" || // Ignore Empty Messages Generated When Someone Changes His Account from Personal to Business or vice-versa
    msg.type === "notification_template" || // Ignore Empty Messages Generated When Someone Changes His Account from Personal to Business or vice-versa
    msg.author !== null || // Ignore Group Messages
    msg.type === "location"
  )
    return true;
  return false;
};

interface HandleMessageOptions {
  /** Indica si es una sincronización de mensajes históricos */
  isSync?: boolean;
  /** Indica si el mensaje ya fue leído (para crear ticket como cerrado) */
  isAlreadyRead?: boolean;
}

const handleMessage = async (
  msg: WbotMessage,
  wbot: Session,
  options: boolean | HandleMessageOptions = false
): Promise<void> => {
  // Compatibilidad con llamadas antiguas que pasan boolean
  const opts: HandleMessageOptions =
    typeof options === "boolean" ? { isSync: options } : options;
  const { isSync = false, isAlreadyRead = false } = opts;

  logger.debug(
    `[handleMessage] Inicio - msgId: ${msg.id.id}, fromMe: ${msg.fromMe}, ` +
      `type: ${msg.type}, isSync: ${isSync}, isAlreadyRead: ${isAlreadyRead}`
  );

  if (!isValidMsg(msg)) {
    logger.debug(
      `[handleMessage] Mensaje ${msg.id.id} no es válido (isValidMsg=false)`
    );
    return;
  }
  const showMessageGroupConnection = await ShowWhatsAppService(wbot.id!);

  const selfJid = `${showMessageGroupConnection.number}@c.us`;
  if (msg.from === selfJid && msg.to === selfJid) {
    logger.debug(
      `[handleMessage] Mensaje ${msg.id.id} ignorado - es mensaje a sí mismo`
    );
    return;
  }

  // IGNORAR MENSAGENS DE GRUPO
  const Settingdb = await Settings.findOne({
    where: { key: "CheckMsgIsGroup" }
  });
  if (showMessageGroupConnection.isGroup) {
  } else if (
    Settingdb?.value === "enabled" ||
    !showMessageGroupConnection.isGroup
  ) {
    const chat = await msg.getChat();

    // Log detallado para debug
    logger.debug(
      // eslint-disable-next-line no-underscore-dangle
      `[handleMessage] Verificando mensaje ${msg.id.id}: type=${msg.type}, from=${msg.from}, to=${msg.to}, author=${msg.author}, chat.id=${chat.id?._serialized}, chat.name=${chat.name}, chat.isGroup=${chat.isGroup}`
    );

    if (
      // msg.type === "sticker" ||
      msg.type === "e2e_notification" ||
      msg.type === "notification_template" ||
      msg.from === "status@broadcast" ||
      chat.isGroup
    ) {
      logger.debug(
        `[handleMessage] Mensaje ${msg.id.id} ignorado - tipo no permitido o grupo (type=${msg.type}, from=${msg.from}, isGroup=${chat.isGroup})`
      );
      return;
    }
  }

  // IGNORAR MENSAGENS DE GRUPO

  try {
    let msgContact: WbotContact;
    let groupContact: Contact | undefined;
    const queueId = 0;
    const tagsId = 0;
    const userId = 0;
    let isBody = false;
    let callSetting: string | undefined;

    // console.log(msg)
    if (msg.fromMe) {
      // messages sent automatically by wbot have a special character in front of it
      // if so, this message was already been stored in database;
      // Skip this check during sync to allow importing historical messages

      if (!isSync) {
        isBody = /\u200e/.test(msg.body[0]);
        if (isBody) return;
      }
      // media messages sent from me from cell phone, first comes with "hasMedia = false" and type = "image/ptt/etc"
      // in this case, return and let this message be handled by "media_uploaded" event, when it will have "hasMedia = true"

      if (
        !msg.hasMedia &&
        msg.type !== "location" &&
        msg.type !== "chat" &&
        msg.type !== "vcard"
        //  && msg.type !== "multi_vcard"
      )
        return;

      msgContact = await wbot.getContactById(msg.to);
    } else {
      const listSettingsService = await ListSettingsServiceOne({ key: "call" });
      callSetting = listSettingsService?.value;

      msgContact = await msg.getContact();
    }

    // Ignore empty chat messages (e.g., empty payloads coming from typebot)
    if (msg.type === "chat" && (!msg.body || msg.body.trim() === "")) {
      logger.debug(
        `[handleMessage] Ignorando mensaje vacío - id: ${msg.id?.id}, from: ${msg.from}`
      );
      return;
    }

    const chat = await msg.getChat();

    if (chat.isGroup) {
      let msgGroupContact;

      if (msg.fromMe) {
        msgGroupContact = await wbot.getContactById(msg.to);
      } else {
        msgGroupContact = await wbot.getContactById(msg.from);
      }

      groupContact = await verifyContact(msgGroupContact);
    }
    const whatsapp = await ShowWhatsAppService(wbot.id!);

    const unreadMessages = msg.fromMe ? 0 : chat.unreadCount;

    const contact = await verifyContact(msgContact);

    // Determinar si crear ticket como cerrado (para sincronización de mensajes ya leídos)
    const shouldCreateAsClosed =
      isSync &&
      isAlreadyRead &&
      process.env.SYNC_CREATE_CLOSED_FOR_READ !== "false";
    const skipAutomations = isSync && isAlreadyRead;

    // console.log("OUTRO TESTE " + unreadMessages)
    const ticket = await FindOrCreateTicketService(
      contact,
      wbot.id!,
      unreadMessages,
      queueId,
      tagsId,
      userId,
      groupContact,
      { createAsClosed: shouldCreateAsClosed }
    );

    if (shouldCreateAsClosed) {
      logger.debug(
        `[handleMessage] Ticket ${ticket.id} creado como cerrado (sync de mensaje leído)`
      );
    }

    if (
      unreadMessages === 0 &&
      whatsapp.farewellMessage &&
      formatBody(whatsapp.farewellMessage, ticket) === msg.body
    ) {
      return;
    }

    // if (msg.body === "#" && ticket.userId === null) {
    //   await ticket.update({
    //     queueOptionId: null,
    //     chatbot: true,
    //     queueId: null,
    //   });
    //   await verifyQueue(wbot, msg, ticket, ticket.contact);
    //   return;
    // }

    // if (msg.body === "#" && ticket.userId === null) {
    //   await ticket.update({
    //     queueOptionId: null,
    //     chatbot: true,
    //     queueId: null,
    //   });
    //   await verifyQueue(wbot, msg, ticket, ticket.contact);
    //   return;
    // }

    const ticketTraking = await FindOrCreateATicketTrakingService({
      ticketId: ticket.id,
      whatsappId: whatsapp?.id,
      userId: ticket.userId
    });

    try {
      if (!msg.fromMe) {
        if (
          ticketTraking !== null &&
          verifyRating(ticketTraking) &&
          whatsapp.ratingMessage
        ) {
          const rate = +msg.body;
          // testa se o usuário digitou uma avaliação numérica, se não enviou, envia novametne a mensagem de avaliação
          if (!Number.isNaN(rate) && Number.isInteger(rate) && !isNull(rate)) {
            handleRating(msg, ticket, ticketTraking);
            return;
          }

          const bodyRatingMessage = `\u200e${whatsapp.ratingMessage}\n`;

          const sentRatingMsg = await SendWhatsAppMessage({
            body: bodyRatingMessage,
            ticket
          });

          await verifyMessage(sentRatingMsg, ticket, ticket.contact);

          return;
        }
      }
    } catch (e) {
      Sentry.captureException(e);
      logger.error(`Error in message listener: ${e}`);
    }

    // Verificar si el mensaje ya existe en la BD (evita duplicados de mensajes enviados desde el panel)
    const existingMessage = await Message.findByPk(msg.id.id);

    if (existingMessage) {
      // El mensaje ya existe, solo actualizar el ack si es necesario
      logger.debug(
        `[handleMessage] Mensaje ${msg.id.id} ya existe en BD, ticketId: ${existingMessage.ticketId}`
      );
      if (existingMessage.ack !== msg.ack) {
        await existingMessage.update({ ack: msg.ack });
      }
      
      // Emitir socket para actualizar el frontend en tiempo real
      const io = getIO();
      const messageWithIncludes = await Message.findByPk(existingMessage.id, {
        include: [
          "contact",
          {
            model: Message,
            as: "quotedMsg",
            include: ["contact"]
          }
        ]
      });
      
      if (messageWithIncludes) {
        io.to(existingMessage.ticketId.toString())
          .to(existingMessage.ticketId.toString())
          .to("notification")
          .emit("appMessage", {
            action: "update",
            message: messageWithIncludes,
            ticket,
            contact
          });
      }
      
      return;
    }

    logger.info(
      `[handleMessage] Creando mensaje nuevo: ${msg.id.id}, fromMe: ${msg.fromMe}, type: ${msg.type}`
    );

    let createdMessage: Message | null = null;

    const shouldDownloadMedia =
      msg.hasMedia &&
      msg.type !== "interactive" && // interactive genera error de webMediaType al descargar
      !(isSync && msg.fromMe); // en sync histórico desde “fromMe” el media suele no estar disponible

    if (shouldDownloadMedia) {
      createdMessage = await verifyMediaMessage(msg, ticket, contact);
    } else {
      createdMessage = await verifyMessage(msg, ticket, contact);
    }

    // Enviar webhook de mensaje recibido o enviado
    // Construir la URL del media si existe
    let mediaUrl: string | null = null;
    let mediaMimeType: string | null = null;

    if (msg.hasMedia && createdMessage) {
      // Obtener el mensaje con la URL completa del media
      const messageWithMedia = await Message.findByPk(createdMessage.id);
      if (messageWithMedia) {
        mediaUrl = messageWithMedia.mediaUrl;
        mediaMimeType = messageWithMedia.mediaType;
      }
    }

    const webhookMessageData = {
      messageId: msg.id.id,
      body: msg.body,
      fromMe: msg.fromMe,
      mediaType: msg.type,
      hasMedia: msg.hasMedia,
      timestamp: msg.timestamp,
      ticketId: ticket.id,
      contact: {
        id: contact.id,
        name: contact.name,
        number: contact.number
      },
      // Información de multimedia
      media: msg.hasMedia
        ? {
            url: mediaUrl,
            mimeType: mediaMimeType,
            type: msg.type // image, video, audio, document, sticker, etc.
          }
        : null
    };

    if (msg.fromMe) {
      sendMessageSentWebhook(wbot.id!, webhookMessageData);
    } else {
      sendMessageReceivedWebhook(wbot.id!, webhookMessageData);
    }

    const hasQueueSelected = Boolean(ticket.queueId);

    if (
      !skipAutomations &&
      !hasQueueSelected &&
      !ticket.useIntegration &&
      !chat.isGroup &&
      !msg.fromMe &&
      !ticket.userId &&
      whatsapp.queues.length >= 1
    ) {
      await verifyQueue(wbot, msg, ticket, contact);
      // Reload ticket to get updated status after queue assignment
      await ticket.reload();
      // If a queue was assigned during verifyQueue, stop processing
      // to avoid triggering sayChatbot or other handlers
      if (ticket.queueId) {
        return;
      }
    }

    // Atualiza o ticket se a ultima mensagem foi enviada por mim, para que possa ser finalizado. Se for grupo, nao finaliza
    try {
      // console.log("FROMME"+ msg.fromMe+" GRUPO "+(await msg.getChat()).isGroup)

      await ticket.update({
        fromMe: msg.fromMe,
        isMsgGroup: chat.isGroup
      });
    } catch (e) {
      Sentry.captureException(e);
      logger.error(`Error in message processing: ${e}`);
    }

    // Handle integration with Typebot, n8n or webhooks
    // Check if ticket already has an active integration
    if (
      !skipAutomations &&
      !msg.fromMe &&
      !chat.isGroup &&
      ticket.useIntegration &&
      ticket.integrationId
    ) {
      try {
        const integration = await ShowQueueIntegrationService(
          ticket.integrationId
        );
        if (integration.type === "typebot") {
          await typebotListener({ wbot, msg, ticket, typebot: integration });
          return;
        }
      } catch (error) {
        logger.error("Error handling integration: ", error);
      }
    }

    // Handle "#" to go back to main menu
    // Allow returning to menu when ticket has queue but agent hasn't responded yet
    if (
      !skipAutomations &&
      msg.body === "#" &&
      !msg.fromMe &&
      !chat.isGroup &&
      ticket.queueId &&
      !ticket.useIntegration
    ) {
      // Reset queue, userId and show main menu options
      await UpdateTicketService({
        ticketData: { queueId: null, userId: null, status: "pending" },
        ticketId: ticket.id
      });

      // Show queue options again
      const { queues, greetingMessage } = whatsapp;
      let options = "";
      queues.forEach((queue, index) => {
        options += `🔹 *${index + 1}* - ${queue.name}\n`;
      });

      const body = formatBody(`\u200e${greetingMessage}\n\n${options}`, ticket);
      const sentMessage = await wbot.sendMessage(
        `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
        body
      );
      await verifyMessage(sentMessage, ticket, contact);
      return;
    }

    // Only run internal chatbot if there's no active typebot integration
    if (
      !skipAutomations &&
      ticket.queue &&
      ticket.queueId &&
      !ticket.useIntegration
    ) {
      if (!ticket.user) {
        await sayChatbot(ticket.queueId, wbot, ticket, contact, msg);
      }
    }

    if (msg.type === "vcard") {
      try {
        const array = msg.body.split("\n");
        const obj = [];
        // eslint-disable-next-line no-shadow
        let contact = "";
        for (let index = 0; index < array.length; index += 1) {
          const v = array[index];
          const values = v.split(":");
          for (let ind = 0; ind < values.length; ind += 1) {
            if (values[ind].indexOf("+") !== -1) {
              obj.push({ number: values[ind] });
            }
            if (values[ind].indexOf("FN") !== -1) {
              contact = values[ind + 1];
            }
          }
        }
        // eslint-disable-next-line no-restricted-syntax
        for await (const ob of obj) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const cont = await CreateContactService({
            name: contact,
            number: ob.number.replace(/\D/g, "")
          });
        }
      } catch (error) {
        logger.error(`Error in webhook/integration: ${error}`);
      }
    }

    // eslint-disable-next-line block-scoped-var
    if (msg.type === "call_log" && callSetting === "disabled") {
      const sentMessage = await wbot.sendMessage(
        `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
        "*Mensagem Automática:*\nLas llamadas de voz y video están deshabilitadas para este WhatsApp, envíe un mensaje de texto. Gracias"
      );
      await verifyMessage(sentMessage, ticket, contact);
    }
    const profilePicUrl = await msgContact.getProfilePicUrl();
    const contactData = {
      name: msgContact.name || msgContact.pushname || msgContact.id.user,
      number: msgContact.id.user,
      profilePicUrl,
      isGroup: msgContact.isGroup
    };
    // console.log(profilePicUrl)
    await CreateOrUpdateContactService(contactData);
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Error handling whatsapp message: Err: ${err}`);
  }
};

export const verifyRating = (ticketTraking: TicketTraking) => {
  if (
    ticketTraking &&
    ticketTraking.finishedAt === null &&
    ticketTraking.closedAt !== null &&
    ticketTraking.userId !== null &&
    ticketTraking.ratingAt === null
  ) {
    return true;
  }
  return false;
};

const handleRating = async (
  msg: WbotMessage,
  ticket: Ticket,
  ticketTraking: TicketTraking
) => {
  const io = getIO();
  let rate: number | null = null;

  const bodyMessage = msg.body;
  const { farewellMessage } = await ShowWhatsAppService(ticket.whatsappId);

  if (bodyMessage) {
    rate = +bodyMessage;
  }

  if (!Number.isNaN(rate) && Number.isInteger(rate) && !isNull(rate)) {
    let finalRate = rate;

    if (rate < 0) {
      finalRate = 0;
    }
    if (rate > 10) {
      finalRate = 10;
    }

    await UserRating.create({
      ticketId: ticketTraking.ticketId,
      userId: ticketTraking.userId,
      rate: finalRate
    });

    // await record?.update({ rate: finalRate });

    if (farewellMessage.trim() !== "") {
      const body = `\u200e${farewellMessage}`;

      await SendWhatsAppMessage({ body, ticket });
    }
    await ticketTraking.update({
      ratingAt: moment().toDate(),
      finishedAt: moment().toDate(),
      rated: true
    });

    await ticket.update({
      status: "closed"
    });

    io.to("open").emit("ticket", {
      action: "delete",
      ticket,
      ticketId: ticket.id
    });

    io.to(ticket.status).to(ticket.id.toString()).emit("ticket", {
      action: "update",
      ticket,
      ticketId: ticket.id
    });
  }
};

const handleMsgAck = async (
  msg: WbotMessage,
  ack: MessageAck,
  wbot: Session
) => {
  await new Promise(r => setTimeout(r, 500));

  const io = getIO();

  try {
    const messageToUpdate = await Message.findByPk(msg.id.id, {
      include: [
        "contact",
        {
          model: Message,
          as: "quotedMsg",
          include: ["contact"]
        }
      ]
    });

    if (!messageToUpdate) {
      return;
    }
    await messageToUpdate.update({ ack });

    io.to(messageToUpdate.ticketId.toString()).emit("appMessage", {
      action: "update",
      message: messageToUpdate
    });

    // Enviar webhook de ACK
    if (wbot.id) {
      sendMessageAckWebhook(wbot.id, {
        messageId: msg.id.id,
        ack,
        ackName: getAckName(ack),
        ticketId: messageToUpdate.ticketId,
        body: msg.body
      });
    }
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Error handling message ack. Err: ${err}`);
  }
};

// Helper function to get ACK name
const getAckName = (ack: MessageAck): string => {
  const ackNames: Record<number, string> = {
    [-1]: "ERROR",
    0: "PENDING",
    1: "SERVER",
    2: "DEVICE",
    3: "READ",
    4: "PLAYED"
  };
  return ackNames[ack] || "UNKNOWN";
};

const wbotMessageListener = async (wbot: Session): Promise<void> => {
  wbot.on("message_create", async msg => {
    logger.debug(
      `[message_create] Mensaje recibido - id: ${msg.id?.id}, fromMe: ${
        msg.fromMe
      }, type: ${msg.type}, body: "${msg.body?.substring(0, 50)}..."`
    );

    if (!msg.fromMe) {
      logger.debug("[message_create] Ignorando mensaje - no es fromMe");
      return;
    }

    try {
      logger.debug(
        `[message_create] Procesando mensaje fromMe - id: ${msg.id?.id}`
      );
      await handleMessage(msg, wbot);
    } catch (err) {
      Sentry.captureException(err);
      logger.error(`Error handling message_create: ${err}`);
    }
  });

  wbot.on("media_uploaded", async msg => {
    if (!msg.fromMe) return;

    try {
      await handleMessage(msg, wbot);
    } catch (err) {
      Sentry.captureException(err);
      logger.error(`Error handling media_uploaded: ${err}`);
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

  wbot.on("message_revoke_everyone", async (after, before) => {
    try {
      const msgBody: string | undefined = before?.body;
      if (msgBody !== undefined) {
        await verifyRevoked(msgBody || "");
      }
    } catch (err) {
      Sentry.captureException(err);
      logger.error(`Error handling message_revoke_everyone: ${err}`);
    }
  });

  // Handler for message edit events (both from user and contacts)
  wbot.on("message_edit", async (msg: WbotMessage, newBody: string) => {
    try {
      logger.info(
        `[MessageEdit] Evento recibido - id: ${msg.id?.id}, fromMe: ${
          msg.fromMe
        }, newBody: "${newBody.substring(0, 50)}..."`
      );

      // Extract the message ID
      const messageId = msg.id?.id;
      if (!messageId) {
        logger.warn("[MessageEdit] No se pudo obtener el ID del mensaje");
        return;
      }

      await HandleMessageEditService({
        messageId,
        newBody,
        fromMe: msg.fromMe
      });
    } catch (err) {
      Sentry.captureException(err);
      logger.error(`Error handling message_edit: ${err}`);
    }
  });

  wbot.on("message_reaction", async (reaction: Reaction) => {
    try {
      // Log para debug de la estructura de la reacción
      logger.info(
        `[Reaction] Recibida: ${JSON.stringify({
          id: reaction.id,
          msgId: reaction.msgId,
          reaction: reaction.reaction,
          senderId: reaction.senderId,
          ack: reaction.ack
        })}`
      );

      // reaction.msgId es el MessageId del mensaje al que se reaccionó
      // reaction.id es el ID de la propia reacción
      // reaction.reaction es el emoji (vacío si se quitó)
      // reaction.senderId es quien envió la reacción

      // Usar msgId que contiene el ID del mensaje original
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msgIdRaw = reaction.msgId as any;
      const messageId =
        typeof msgIdRaw === "string"
          ? msgIdRaw
          : // eslint-disable-next-line no-underscore-dangle
            msgIdRaw?.id || msgIdRaw?._serialized || reaction.id?.id;

      const emoji = reaction.reaction;

      // senderId puede ser string o objeto con _serialized
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const senderIdRaw = reaction.senderId as any;
      const senderId =
        typeof senderIdRaw === "string"
          ? senderIdRaw
          : // eslint-disable-next-line no-underscore-dangle
            senderIdRaw._serialized || String(senderIdRaw);

      // fromMe indica si la reacción es nuestra
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fromMe = (reaction as any).id?.fromMe || false;

      logger.info(
        `[Reaction] Procesando: messageId=${messageId}, emoji=${emoji}, senderId=${senderId}`
      );

      // Obtener nombre del contacto si está disponible
      let senderName: string | undefined;
      try {
        const contact = await wbot.getContactById(senderId);
        senderName = contact?.pushname || contact?.name;
      } catch {
        // Ignorar si no se puede obtener el contacto
      }

      await HandleMessageReactionService({
        reactionData: {
          messageId,
          emoji,
          senderId,
          senderName,
          fromMe
        }
      });
    } catch (err) {
      Sentry.captureException(err);
      logger.error(`Error handling message_reaction: ${err}`);
    }
  });
};

export { wbotMessageListener, handleMessage, handleMsgAck };
