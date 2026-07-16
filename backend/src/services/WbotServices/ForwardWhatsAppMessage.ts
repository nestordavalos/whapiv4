import { MessageMedia } from "whatsapp-web.js";
import path from "path";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import { logger } from "../../utils/logger";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { getStorageService } from "../StorageServices/StorageService";
import Whatsapp from "../../models/Whatsapp";
import { getWhaileys, whaileysJid } from "../../libs/whaileys";
import { sendZapoMessage, zapoJid } from "../../libs/zapo";

interface Request {
  message: Message;
  ticket: Ticket;
  contactNumber: string;
}

interface ForwardResult {
  success: boolean;
  destinationTicketId?: number;
}

const ForwardWhatsAppMessage = async ({
  message,
  ticket,
  contactNumber
}: Request): Promise<ForwardResult> => {
  try {
    // Find destination contact
    const destinationContact = await Contact.findOne({
      where: { number: contactNumber }
    });

    if (!destinationContact) {
      throw new AppError("ERR_NO_CONTACT_FOUND");
    }

    // Build the destination chat ID
    const destinationChatId = `${contactNumber}@c.us`;

    // Find or create a ticket for the destination contact
    const destinationTicket = await FindOrCreateTicketService(
      destinationContact,
      ticket.whatsappId,
      0 // unreadMessages
    );

    const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);
    if (whatsapp?.provider === "zapo") {
      const remoteJid = zapoJid(
        contactNumber,
        false,
        destinationContact.remoteJid
      );
      const originalMediaUrl = message.getDataValue("mediaUrl");
      let content: any = message.body || "";
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;

      if (originalMediaUrl && message.mediaType) {
        const buffer = await getStorageService().downloadToBuffer(
          originalMediaUrl
        );
        const mimeType = message.mediaType === "image"
          ? "image/jpeg"
          : message.mediaType === "video"
          ? "video/mp4"
          : message.mediaType === "audio"
          ? "audio/ogg; codecs=opus"
          : "application/octet-stream";
        const type = ["image", "video", "audio", "sticker"].includes(
          message.mediaType
        )
          ? message.mediaType
          : "document";
        content = {
          type,
          media: buffer,
          mimetype: mimeType,
          fileName: path.basename(originalMediaUrl),
          ...(message.body ? { caption: message.body } : {}),
          ...(type === "audio" ? { ptt: true } : {})
        };
        mediaUrl = originalMediaUrl;
        mediaType = message.mediaType;
      }

      const sent = await sendZapoMessage(whatsapp.id, remoteJid, content, {
        forward: true
      });
      await CreateMessageService({
        messageData: {
          id: sent.id,
          ticketId: destinationTicket.id,
          body: message.body || "",
          contactId: destinationContact.id,
          fromMe: true,
          read: true,
          mediaUrl,
          mediaType,
          ack: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      await destinationTicket.update({
        lastMessage: message.body || (mediaType ? `[${mediaType}]` : "")
      });
      return { success: true, destinationTicketId: destinationTicket.id };
    }

    if (whatsapp?.provider === "whaileys") {
      const remoteJid = whaileysJid(
        contactNumber,
        false,
        destinationContact.remoteJid
      );
      const originalMediaUrl = message.getDataValue("mediaUrl");
      let content: any = { text: message.body || "" };
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;

      if (originalMediaUrl && message.mediaType) {
        const buffer = await getStorageService().downloadToBuffer(
          originalMediaUrl
        );
        const mimeType = message.mediaType.startsWith("image")
          ? "image/jpeg"
          : message.mediaType.startsWith("video")
          ? "video/mp4"
          : message.mediaType.startsWith("audio")
          ? "audio/ogg"
          : "application/octet-stream";
        content = {
          document: buffer,
          mimetype: mimeType,
          fileName: path.basename(originalMediaUrl),
          caption: message.body || undefined
        };
        mediaUrl = originalMediaUrl;
        mediaType = message.mediaType;
      }

      const sent = await getWhaileys(whatsapp.id).sendMessage(
        remoteJid,
        content
      );
      const id = sent?.key.id;
      if (!id)
        throw new Error("Whaileys did not return a forwarded message id");
      await CreateMessageService({
        messageData: {
          id,
          ticketId: destinationTicket.id,
          body: message.body || "",
          contactId: destinationContact.id,
          fromMe: true,
          read: true,
          mediaUrl,
          mediaType,
          ack: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      await destinationTicket.update({
        lastMessage: message.body || (mediaType ? `[${mediaType}]` : "")
      });
      return { success: true, destinationTicketId: destinationTicket.id };
    }

    const wbot = await GetTicketWbot(ticket);

    let sentMessage;
    const forwardedBody = message.body || "";
    let storedBody = forwardedBody;
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;

    // Check if the message has media
    const originalMediaUrl = message.getDataValue("mediaUrl");

    if (originalMediaUrl && message.mediaType) {
      const storageService = getStorageService();
      const ext = path.extname(originalMediaUrl).toLowerCase();
      const mimeMap: Record<string, string> = {
        ".jpeg": "image/jpeg",
        ".jpg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".mp4": "video/mp4",
        ".3gp": "video/3gpp",
        ".ogg": "audio/ogg",
        ".oga": "audio/ogg",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xls": "application/vnd.ms-excel",
        ".xlsx":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      };

      try {
        const buffer = await storageService.downloadToBuffer(originalMediaUrl);
        const mimeType =
          mimeMap[ext] ||
          (message.mediaType
            ? `${message.mediaType}/*`
            : "application/octet-stream");
        const media = new MessageMedia(
          mimeType,
          buffer.toString("base64"),
          path.basename(originalMediaUrl)
        );

        sentMessage = await wbot.sendMessage(destinationChatId, media, {
          caption: forwardedBody || undefined,
          sendAudioAsVoice: message.mediaType === "audio"
        });

        mediaUrl = originalMediaUrl;
        mediaType = message.mediaType;
      } catch (error: any) {
        logger.warn(
          `Media file not found in storage (${originalMediaUrl}): ${error.message}`
        );
        const fallbackText = forwardedBody || "[Media no disponible]";
        sentMessage = await wbot.sendMessage(destinationChatId, fallbackText);
        storedBody = fallbackText;
      }
    } else {
      // Send text message
      sentMessage = await wbot.sendMessage(destinationChatId, forwardedBody);
      storedBody = forwardedBody;
    }

    // Create the message in the database
    const timestamp = sentMessage.timestamp
      ? new Date(sentMessage.timestamp * 1000)
      : new Date();

    await CreateMessageService({
      messageData: {
        id: sentMessage.id.id,
        ticketId: destinationTicket.id,
        body: storedBody,
        contactId: destinationContact.id,
        fromMe: true,
        read: true,
        mediaType,
        mediaUrl,
        createdAt: timestamp,
        updatedAt: timestamp
      }
    });

    // Update the destination ticket's last message
    await destinationTicket.update({
      lastMessage:
        storedBody || (mediaType ? `[${mediaType}]` : "Forwarded message")
    });

    logger.info(
      `Message ${message.id} forwarded to ${destinationChatId} successfully`
    );

    return {
      success: true,
      destinationTicketId: destinationTicket.id
    };
  } catch (err: any) {
    logger.error(`Error forwarding WhatsApp message: ${err.message}`);
    throw new AppError("ERR_FORWARD_WAPP_MSG");
  }
};

export default ForwardWhatsAppMessage;
