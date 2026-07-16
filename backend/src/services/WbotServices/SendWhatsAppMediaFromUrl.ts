import { MessageMedia, Message as WbotMessage } from "whatsapp-web.js";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import GetWbotMessage from "../../helpers/GetWbotMessage";
import SerializeWbotMsgId from "../../helpers/SerializeWbotMsgId";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";

import formatBody from "../../helpers/Mustache";
import { logger } from "../../utils/logger";
import {
  getContactJid,
  resolveLidFromPhone,
  sendMessageWithLidFallback
} from "../../helpers/GetContactJid";
import { isFetchMessagesStoreError } from "../../helpers/WhatsAppWebErrors";
import Whatsapp from "../../models/Whatsapp";
import { getWhaileys, whaileysJid } from "../../libs/whaileys";
import { getZapoQuotedMessage, resolveZapoRecipientJid, sendZapoMessage } from "../../libs/zapo";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { getStorageService } from "../StorageServices/StorageService";

interface Request {
  mediaUrl: string;
  ticket: Ticket;
  body?: string;
  quotedMsg?: Message;
  filename?: string;
  voiceNote?: boolean;
}

const SendWhatsAppMediaFromUrl = async ({
  mediaUrl,
  ticket,
  body,
  quotedMsg,
  filename,
  voiceNote = false
}: Request): Promise<WbotMessage> => {
  const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);
  const hasBody = body ? formatBody(body, ticket) : undefined;

  if (whatsapp?.provider === "zapo") {
    try {
      const response = await fetch(mediaUrl);
      if (!response.ok) {
        throw new Error(`Could not download URL media (${response.status})`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const mimeType =
        response.headers.get("content-type")?.split(";")[0] ||
        "application/octet-stream";
      const mimeRoot = mimeType.split("/")[0];
      const type = ["image", "video", "audio"].includes(mimeRoot)
        ? mimeRoot
        : "document";
      const isVoiceNote =
        type === "audio" &&
        (voiceNote || /audio\/ogg(?:;.*opus)?/i.test(mimeType));
      const finalFilename =
        filename || `${Date.now()}.${mimeType.split("/")[1] || "bin"}`;
      const remoteJid = await resolveZapoRecipientJid(
        whatsapp.id,
        ticket.contact.number,
        ticket.isGroup,
        ticket.contact.remoteJid
      );
      const quotedMessage = quotedMsg
        ? await getZapoQuotedMessage(whatsapp.id, quotedMsg.id)
        : undefined;
      const sent = await sendZapoMessage(
        whatsapp.id,
        remoteJid,
        {
          type,
          media: buffer,
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
                message: quotedMessage
              }
            : undefined
        }
      );

      await getStorageService().uploadBuffer(buffer, finalFilename, mimeType);
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
      await ticket.update({
        lastMessage: body || filename || "Media from URL"
      });

      return {
        id: { id: sent.id },
        body: hasBody || "",
        timestamp: Math.floor(Date.now() / 1000),
        fromMe: true,
        hasMedia: true,
        ack: 1
      } as unknown as WbotMessage;
    } catch (err) {
      logger.error({ ticketId: ticket.id, err }, "Error sending Zapo URL media");
      if (err instanceof AppError) throw err;
      throw new AppError("ERR_SENDING_WAPP_MSG_FROM_URL");
    }
  }

  if (whatsapp?.provider === "whaileys") {
    try {
      const socket = getWhaileys(whatsapp.id);
      const remoteJid = whaileysJid(
        ticket.contact.number,
        ticket.isGroup,
        ticket.contact.remoteJid
      );
      const sent = await socket.sendMessage(
        remoteJid,
        {
          document: { url: mediaUrl },
          caption: hasBody,
          fileName: filename,
          mimetype: "application/octet-stream"
        },
        quotedMsg
          ? ({
              quoted: {
                key: { id: quotedMsg.id, remoteJid, fromMe: quotedMsg.fromMe }
              }
            } as any)
          : undefined
      );
      const id = sent?.key.id;
      if (!id) throw new Error("Whaileys did not return a media message id");
      await ticket.update({
        lastMessage: body || filename || "Media from URL"
      });
      return {
        id: { id },
        body: hasBody || "",
        timestamp: Math.floor(Date.now() / 1000),
        fromMe: true,
        hasMedia: true,
        ack: 0
      } as unknown as WbotMessage;
    } catch (err) {
      logger.error(
        { ticketId: ticket.id, err },
        "Error sending Whaileys URL media"
      );
      if (err instanceof AppError) throw err;
      throw new AppError("ERR_SENDING_WAPP_MSG_FROM_URL");
    }
  }

  let quotedMsgSerializedId: string | undefined;
  if (quotedMsg) {
    try {
      await GetWbotMessage(ticket, quotedMsg.id);
    } catch (err) {
      logger.debug(
        "Could not fetch quoted URL media message, using fallback serialization"
      );
    }
    quotedMsgSerializedId = SerializeWbotMsgId(ticket, quotedMsg);
  }

  const wbot = await GetTicketWbot(ticket);

  try {
    // Descargar media desde URL
    const newMedia = await MessageMedia.fromUrl(mediaUrl, {
      unsafeMime: true,
      filename: filename || undefined
    });

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

    await ticket.update({
      lastMessage: body || filename || "Media from URL"
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
      let lastMessage: WbotMessage | undefined;

      try {
        [lastMessage] = await chat.fetchMessages({ limit: 1 });
      } catch (fetchErr) {
        if (isFetchMessagesStoreError(fetchErr)) {
          logger.warn(
            `WhatsApp URL media send verification could not read chat history for ticket ${ticket.id}: ${fetchErr}`
          );
        } else {
          throw fetchErr;
        }
      }

      if (lastMessage && lastMessage.fromMe && lastMessage.hasMedia) {
        await ticket.update({
          lastMessage: body || filename || "Media from URL"
        });
        return lastMessage as WbotMessage;
      }
    } catch (checkErr) {
      logger.warn(`Failed to verify sent media from URL: ${checkErr}`);
    }

    logger.warn(`Error sending WhatsApp media from URL: ${err}`);
    throw new AppError("ERR_SENDING_WAPP_MSG_FROM_URL");
  }
};

export default SendWhatsAppMediaFromUrl;
