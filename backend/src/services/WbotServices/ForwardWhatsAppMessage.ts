import { MessageMedia } from "whatsapp-web.js";
import fs from "fs";
import path from "path";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import { logger } from "../../utils/logger";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import CreateMessageService from "../MessageServices/CreateMessageService";

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
    let forwardedBody = message.body || "";
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;

    // Check if the message has media
    const originalMediaUrl = message.getDataValue("mediaUrl");
    
    if (originalMediaUrl && message.mediaType) {
      // Get the media file path
      const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
      const mediaPath = path.join(publicFolder, originalMediaUrl);

      if (fs.existsSync(mediaPath)) {
        // Send media message
        const media = MessageMedia.fromFilePath(mediaPath);
        sentMessage = await wbot.sendMessage(destinationChatId, media, {
          caption: forwardedBody || undefined,
          sendAudioAsVoice: message.mediaType === "audio"
        });
        mediaUrl = originalMediaUrl;
        mediaType = message.mediaType;
      } else {
        // Media file not found, send as text
        logger.warn(`Media file not found: ${mediaPath}`);
        sentMessage = await wbot.sendMessage(
          destinationChatId,
          forwardedBody || "[Media no disponible]"
        );
      }
    } else {
      // Send text message
      sentMessage = await wbot.sendMessage(destinationChatId, forwardedBody);
    }

    // Create the message in the database
    const timestamp = sentMessage.timestamp
      ? new Date(sentMessage.timestamp * 1000)
      : new Date();

    await CreateMessageService({
      messageData: {
        id: sentMessage.id.id,
        ticketId: destinationTicket.id,
        body: forwardedBody,
        contactId: destinationContact.id,
        fromMe: true,
        read: true,
        mediaType: mediaType,
        mediaUrl: mediaUrl,
        createdAt: timestamp,
        updatedAt: timestamp
      }
    });

    // Update the destination ticket's last message
    await destinationTicket.update({
      lastMessage: forwardedBody || (mediaType ? `[${mediaType}]` : "Forwarded message")
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
