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
    const wbot = await GetTicketWbot(ticket);

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
