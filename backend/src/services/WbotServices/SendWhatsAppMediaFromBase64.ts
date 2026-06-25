import { MessageMedia, Message as WbotMessage } from "whatsapp-web.js";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import GetWbotMessage from "../../helpers/GetWbotMessage";
import SerializeWbotMsgId from "../../helpers/SerializeWbotMsgId";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";

import formatBody from "../../helpers/Mustache";
import { logger } from "../../utils/logger";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { getStorageService } from "../StorageServices/StorageService";
import {
  getContactJid,
  resolveLidFromPhone,
  sendMessageWithLidFallback
} from "../../helpers/GetContactJid";

interface Request {
  base64Data: string;
  mimeType: string;
  ticket: Ticket;
  body?: string;
  quotedMsg?: Message;
  filename?: string;
}

const SendWhatsAppMediaFromBase64 = async ({
  base64Data,
  mimeType,
  ticket,
  body,
  quotedMsg,
  filename
}: Request): Promise<WbotMessage> => {
  let quotedMsgSerializedId: string | undefined;
  if (quotedMsg) {
    await GetWbotMessage(ticket, quotedMsg.id);
    quotedMsgSerializedId = SerializeWbotMsgId(ticket, quotedMsg);
  }

  const wbot = await GetTicketWbot(ticket);
  const hasBody = body ? formatBody(body as string, ticket) : undefined;

  try {
    // Remover el prefijo data:...;base64, si existe
    let cleanBase64 = base64Data;
    if (base64Data.includes("base64,")) {
      cleanBase64 = base64Data.split("base64,")[1];
    } else if (base64Data.includes(",")) {
      cleanBase64 = base64Data.split(",")[1];
    }

    // Generar nombre de archivo único si no se proporciona
    let finalFilename = filename;
    if (!finalFilename) {
      const ext = mimeType.split("/")[1].split(";")[0];
      finalFilename = `${new Date().getTime()}.${ext}`;
    } else {
      const originalFilename = `-${finalFilename}`;
      finalFilename = `${new Date().getTime()}${originalFilename}`;
    }

    // Guardar el archivo usando StorageService
    try {
      const storageService = getStorageService();
      await storageService.uploadBase64(cleanBase64, finalFilename, mimeType);
      logger.debug(`Media uploaded via StorageService: ${finalFilename}`);
    } catch (err: any) {
      logger.error(`Failed to upload media via StorageService: ${err}`);
      throw new AppError("ERR_UPLOAD_MEDIA");
    }

    // Crear MessageMedia desde base64
    const newMedia = new MessageMedia(mimeType, cleanBase64, finalFilename);

    const sentMessage = await sendMessageWithLidFallback(
      wbot,
      ticket.contact.number,
      ticket.isGroup,
      newMedia,
      {
        caption: hasBody,
        sendAudioAsVoice: true,
        quotedMessageId: quotedMsgSerializedId
      }
    );

    // Determinar el tipo de archivo para el mensaje
    let fileTypeDescription: string;
    const mediaType = mimeType.split("/")[0];

    switch (mediaType) {
      case "audio":
        fileTypeDescription = "🔉 Mensaje de audio";
        break;
      case "image":
        fileTypeDescription = "🖼️ Archivo de imagen";
        break;
      case "video":
        fileTypeDescription = "🎬 Archivo de vídeo";
        break;
      case "document":
      case "application":
        fileTypeDescription = "📎 Documento";
        break;
      default:
        fileTypeDescription = "📎 Archivo";
        break;
    }

    // Crear el mensaje en la base de datos
    const messageData = {
      id: sentMessage.id.id,
      ticketId: ticket.id,
      contactId: undefined,
      body: hasBody || fileTypeDescription,
      fromMe: true,
      read: true,
      mediaUrl: finalFilename,
      mediaType: mediaType,
      quotedMsgId: quotedMsg?.id,
      ack: sentMessage.ack,
      createdAt: new Date(sentMessage.timestamp * 1000),
      updatedAt: new Date(sentMessage.timestamp * 1000)
    };

    await CreateMessageService({ messageData });

    await ticket.update({
      lastMessage: `${"🢅⠀"}${fileTypeDescription}`
    });

    return sentMessage;
  } catch (err) {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      let chat;
      const primaryJid = getContactJid(ticket.contact.number, ticket.isGroup);
      try {
        chat = await wbot.getChatById(primaryJid);
      } catch {
        if (!ticket.isGroup && !primaryJid.endsWith("@lid")) {
          const lidNumber = await resolveLidFromPhone(
            wbot,
            ticket.contact.number
          );
          if (lidNumber) {
            chat = await wbot.getChatById(`${lidNumber}@lid`);
          }
        }
      }
      const [lastMessage] = await chat.fetchMessages({ limit: 1 });
      if (lastMessage && lastMessage.fromMe && lastMessage.hasMedia) {
        await ticket.update({
          lastMessage: body || filename || "Media from base64"
        });
        return lastMessage as WbotMessage;
      }
    } catch (checkErr) {
      logger.warn(`Failed to verify sent media from base64: ${checkErr}`);
    }

    logger.warn(`Error sending WhatsApp media from base64: ${err}`);
    throw new AppError("ERR_SENDING_WAPP_MSG_FROM_BASE64");
  }
};

export default SendWhatsAppMediaFromBase64;
