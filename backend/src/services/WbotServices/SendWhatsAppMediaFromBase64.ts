import { MessageMedia, Message as WbotMessage } from "whatsapp-web.js";
import { Op } from "sequelize";
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
import { isFetchMessagesStoreError } from "../../helpers/WhatsAppWebErrors";
import { isZapoTrustedContactPrivacyNack } from "../../helpers/ZapoErrors";
import Whatsapp from "../../models/Whatsapp";
import {
  getZapoQuoteMetadata,
  hasZapoTrustedContactToken,
  resolveZapoRecipientJid,
  sendZapoMessage
} from "../../libs/zapo";
import { ZapoOutboundSource } from "../../libs/ZapoOutboundPacing";
import {
  assertZapoRecipientCanReceive,
  blockZapoRecipientSend,
  createZapoRecipientBlockedError,
  unblockZapoRecipientForTicket
} from "./ZapoRecipientSendBlockService";

interface Request {
  base64Data: string;
  mimeType: string;
  ticket: Ticket;
  body?: string;
  quotedMsg?: Message;
  filename?: string;
  source?: ZapoOutboundSource;
}

const buildSentMessageFromStoredMessage = (message: Message): WbotMessage =>
  ({
    id: { id: message.id },
    timestamp: Math.floor(new Date(message.createdAt).getTime() / 1000),
    fromMe: true,
    hasMedia: true,
    ack: message.ack
  } as unknown as WbotMessage);

const SendWhatsAppMediaFromBase64 = async ({
  base64Data,
  mimeType,
  ticket,
  body,
  quotedMsg,
  filename,
  source
}: Request): Promise<WbotMessage> => {
  const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);
  if (whatsapp?.provider === "zapo") {
    try {
      const hasBody = body ? formatBody(body, ticket) : undefined;
      const cleanBase64 = base64Data.includes("base64,")
        ? base64Data.split("base64,")[1]
        : base64Data.includes(",")
        ? base64Data.split(",")[1]
        : base64Data;
      const mimeRoot = mimeType.split("/")[0];
      const type = ["image", "video", "audio"].includes(mimeRoot)
        ? mimeRoot
        : "document";
      const isVoiceNote =
        type === "audio";
      const finalFilename =
        filename || `${Date.now()}.${mimeType.split("/")[1] || "bin"}`;
      const remoteJid = await resolveZapoRecipientJid(
        whatsapp.id,
        ticket.contact.number,
        ticket.isGroup,
        ticket.contact.remoteJid
      );
      if (await hasZapoTrustedContactToken(whatsapp.id, remoteJid)) {
        await unblockZapoRecipientForTicket(ticket);
      }
      await assertZapoRecipientCanReceive(ticket, whatsapp.number);
      const quoteMetadata = quotedMsg
        ? await getZapoQuoteMetadata(whatsapp.id, quotedMsg.id)
        : undefined;
      const sent = await sendZapoMessage(
        whatsapp.id,
        remoteJid,
        {
          type,
          media: Buffer.from(cleanBase64, "base64"),
          mimetype: mimeType,
          ...(type !== "audio" ? { fileName: finalFilename } : {}),
          ...(hasBody ? { caption: hasBody } : {}),
          ...(isVoiceNote ? { ptt: true } : {})
        },
        {
          quote: quotedMsg
            ? {
                id: quotedMsg.id,
                remoteJid,
                fromMe: quotedMsg.fromMe,
                participant: quoteMetadata?.participant,
                message: quoteMetadata?.message
              }
            : undefined
        },
        source
      );
      await getStorageService().uploadBase64(
        cleanBase64,
        finalFilename,
        mimeType
      );
      await CreateMessageService({
        messageData: {
          id: sent.id,
          ticketId: ticket.id,
          body: hasBody || "",
          fromMe: true,
          read: true,
          mediaUrl: finalFilename,
          mediaType: type,
          quotedMsgId: quotedMsg?.id,
          ack: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      await ticket.update({ lastMessage: body || filename || "Media from base64" });
      return {
        id: { id: sent.id },
        body: hasBody || "",
        timestamp: Math.floor(Date.now() / 1000),
        fromMe: true,
        hasMedia: true,
        ack: 1
      } as unknown as WbotMessage;
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (isZapoTrustedContactPrivacyNack(err)) {
        logger.warn(
          {
            ticketId: ticket.id,
            whatsappId: whatsapp.id,
            contactId: ticket.contact.id,
            code: 463,
            retryable: false,
            messageType: "base64-media"
          },
          "Zapo send blocked until the contact replies"
        );
        await blockZapoRecipientSend(ticket, whatsapp.number);
        throw createZapoRecipientBlockedError(ticket);
      }
      logger.error({ ticketId: ticket.id, err }, "Error sending Zapo base64 media");
      throw new AppError("ERR_SENDING_WAPP_MSG");
    }
  }

  let quotedMsgSerializedId: string | undefined;
  if (quotedMsg) {
    try {
      await GetWbotMessage(ticket, quotedMsg.id);
    } catch (err) {
      logger.debug(
        "Could not fetch quoted base64 message, using fallback serialization"
      );
    }
    quotedMsgSerializedId = SerializeWbotMsgId(ticket, quotedMsg);
  }

  const wbot = await GetTicketWbot(ticket);
  const hasBody = body ? formatBody(body as string, ticket) : undefined;
  const sendStartedAt = new Date(Date.now() - 2000);
  const mimeRootType = mimeType.split("/")[0];
  const expectedMediaTypes =
    mimeRootType === "application"
      ? ["application", "document"]
      : [mimeRootType];
  let finalFilename = filename;
  let cleanBase64 = base64Data;

  try {
    // Remover el prefijo data:...;base64, si existe
    if (base64Data.includes("base64,")) {
      [, cleanBase64] = base64Data.split("base64,");
    } else if (base64Data.includes(",")) {
      [, cleanBase64] = base64Data.split(",");
    }

    // Generar nombre de archivo único si no se proporciona
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

    let sentMessage: WbotMessage;

    try {
      sentMessage = await sendMessageWithLidFallback(
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
    } catch (sendErr) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const storedSentMessage = await Message.findOne({
          where: {
            ticketId: ticket.id,
            fromMe: true,
            mediaUrl: { [Op.ne]: null },
            mediaType: { [Op.in]: expectedMediaTypes },
            createdAt: { [Op.gte]: sendStartedAt }
          },
          order: [["createdAt", "DESC"]]
        });

        if (storedSentMessage) {
          logger.warn(
            {
              ticketId: ticket.id,
              messageId: storedSentMessage.id,
              err: sendErr
            },
            "WhatsApp media send reported an error, but outgoing media was stored"
          );

          await ticket.update({
            lastMessage: body || filename || "Media from base64"
          });

          return buildSentMessageFromStoredMessage(storedSentMessage);
        }
      } catch (dbCheckErr) {
        logger.warn(
          `Failed to verify sent media from base64 in database: ${dbCheckErr}`
        );
      }

      throw sendErr;
    }

    // Determinar el tipo de archivo para el mensaje
    let fileTypeDescription: string;
    const mediaType = mimeRootType;

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

    try {
      // Crear el mensaje en la base de datos. El listener de whatsapp-web.js
      // puede crearlo antes; esto queda como respaldo best-effort.
      const messageData = {
        id: sentMessage.id.id,
        ticketId: ticket.id,
        contactId: undefined,
        body: hasBody || fileTypeDescription,
        fromMe: true,
        read: true,
        mediaUrl: finalFilename,
        mediaType,
        quotedMsgId: quotedMsg?.id,
        ack: sentMessage.ack,
        createdAt: new Date(sentMessage.timestamp * 1000),
        updatedAt: new Date(sentMessage.timestamp * 1000)
      };

      await CreateMessageService({ messageData });

      await ticket.update({
        lastMessage: `${"🢅⠀"}${fileTypeDescription}`
      });
    } catch (postSendErr) {
      logger.warn(
        {
          ticketId: ticket.id,
          messageId: sentMessage.id?.id,
          err: postSendErr
        },
        "WhatsApp media from base64 was sent, but post-send persistence failed"
      );
    }

    return sentMessage;
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }

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
      let lastMessage: WbotMessage | undefined;

      try {
        [lastMessage] = await chat.fetchMessages({ limit: 1 });
      } catch (fetchErr) {
        if (isFetchMessagesStoreError(fetchErr)) {
          logger.warn(
            `WhatsApp base64 media send verification could not read chat history for ticket ${ticket.id}: ${fetchErr}`
          );
        } else {
          throw fetchErr;
        }
      }

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
