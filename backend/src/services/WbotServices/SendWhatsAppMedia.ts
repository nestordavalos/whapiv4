import fs from "fs";
import { MessageMedia, Message as WbotMessage } from "whatsapp-web.js";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Ticket from "../../models/Ticket";

import formatBody from "../../helpers/Mustache";
import { logger } from "../../utils/logger";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  body?: string;
}

const SendWhatsAppMedia = async ({
  media,
  ticket,
  body
}: Request): Promise<WbotMessage> => {
  const wbot = await GetTicketWbot(ticket);
  const hasBody = body ? formatBody(body as string, ticket) : undefined;

  try {
    const newMedia = MessageMedia.fromFilePath(media.path);
    const sentMessage = await wbot.sendMessage(
      `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`,
      newMedia,
      {
        caption: hasBody,
        sendAudioAsVoice: true
      }
    );

    await ticket.update({ lastMessage: body || media.filename });
    fs.unlinkSync(media.path);
    return sentMessage;
  } catch (err) {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const chat = await wbot.getChatById(
        `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`
      );
      const [lastMessage] = await chat.fetchMessages({ limit: 1 });
      if (lastMessage && lastMessage.fromMe && lastMessage.hasMedia) {
        await ticket.update({ lastMessage: body || media.filename });
        fs.unlinkSync(media.path);
        return lastMessage as WbotMessage;
      }
    } catch (checkErr) {
      logger.warn(`Failed to verify sent media: ${checkErr}`);
    }

    fs.unlinkSync(media.path);
    logger.warn(`Error sending WhatsApp media: ${err}`);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMedia;
