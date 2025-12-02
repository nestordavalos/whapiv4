import { MessageMedia, Message as WbotMessage } from "whatsapp-web.js";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import GetWbotMessage from "../../helpers/GetWbotMessage";
import SerializeWbotMsgId from "../../helpers/SerializeWbotMsgId";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";

import formatBody from "../../helpers/Mustache";
import { logger } from "../../utils/logger";

interface Request {
  mediaUrl: string;
  ticket: Ticket;
  body?: string;
  quotedMsg?: Message;
  filename?: string;
}

const SendWhatsAppMediaFromUrl = async ({
  mediaUrl,
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
    // Descargar media desde URL
    const newMedia = await MessageMedia.fromUrl(mediaUrl, {
      unsafeMime: true,
      filename: filename || undefined
    });

    const sentMessage = await wbot.sendMessage(
      `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`,
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
      const chat = await wbot.getChatById(
        `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`
      );
      const [lastMessage] = await chat.fetchMessages({ limit: 1 });
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
