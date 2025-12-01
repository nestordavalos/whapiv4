import fs from "fs";
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
  media: Express.Multer.File;
  ticket: Ticket;
  body?: string;
  quotedMsg?: Message;
}

const SendWhatsAppMedia = async ({
  media,
  ticket,
  body,
  quotedMsg
}: Request): Promise<WbotMessage> => {
  let quotedMsgSerializedId: string | undefined;
  if (quotedMsg) {
    await GetWbotMessage(ticket, quotedMsg.id);
    quotedMsgSerializedId = SerializeWbotMsgId(ticket, quotedMsg);
  }

  const wbot = await GetTicketWbot(ticket);
  const hasBody = body ? formatBody(body as string, ticket) : undefined;

  try {
    const newMedia = MessageMedia.fromFilePath(media.path);
    const sentMessage = await wbot.sendMessage(
      `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`,
      newMedia,
      {
        caption: hasBody,
        sendAudioAsVoice: true,
        quotedMessageId: quotedMsgSerializedId
      }
    );

    await ticket.update({ lastMessage: body || media.filename });
    // NO borrar el archivo - se necesita para mostrarlo en el panel
    // fs.unlinkSync(media.path);
    return sentMessage;
  } catch (err) {
    logger.error(`[SendWhatsAppMedia] Error inicial: ${err.message}`);

    // Retry: Intentar verificar si el mensaje se envió
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const chat = await wbot.getChatById(
        `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`
      );
      const [lastMessage] = await chat.fetchMessages({ limit: 1 });
      if (lastMessage && lastMessage.fromMe && lastMessage.hasMedia) {
        logger.info(
          `[SendWhatsAppMedia] Mensaje verificado exitosamente en retry`
        );
        await ticket.update({ lastMessage: body || media.filename });
        // NO borrar el archivo - se necesita para mostrarlo en el panel
        // fs.unlinkSync(media.path);
        return lastMessage as WbotMessage;
      }
    } catch (checkErr) {
      logger.error(
        `[SendWhatsAppMedia] Error en verificación: ${checkErr.message}`
      );
    }

    // NO borrar el archivo - se necesita para mostrarlo en el panel
    // fs.unlinkSync(media.path);
    logger.error(
      `[SendWhatsAppMedia] Error final enviando media: ${err.message}`
    );
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMedia;
