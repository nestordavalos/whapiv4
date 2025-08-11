import { Message as WbotMessage } from "whatsapp-web.js";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import GetWbotMessage from "../../helpers/GetWbotMessage";
import SerializeWbotMsgId from "../../helpers/SerializeWbotMsgId";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";

import formatBody from "../../helpers/Mustache";
import { logger } from "../../utils/logger";

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
}

const SendWhatsAppMessage = async ({
  body,
  ticket,
  quotedMsg
}: Request): Promise<WbotMessage> => {
  let quotedMsgSerializedId: string | undefined;
  if (quotedMsg) {
    await GetWbotMessage(ticket, quotedMsg.id);
    quotedMsgSerializedId = SerializeWbotMsgId(ticket, quotedMsg);
  }

  const wbot = await GetTicketWbot(ticket);
  const formattedBody = formatBody(body, ticket);

  try {
    const sentMessage = await wbot.sendMessage(
      `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`,
      formattedBody,
      {
        quotedMessageId: quotedMsgSerializedId,
        linkPreview: false
      }
    );

    await ticket.update({ lastMessage: body });
    return sentMessage;
  } catch (err) {
    if (
      err.message ===
      "Protocol error (Runtime.callFunctionOn): Promise was collected"
    ) {
      // Terminate process after 1 seconds
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const chat = await wbot.getChatById(
        `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`
      );
      const [lastMessage] = await chat.fetchMessages({ limit: 1 });
      if (
        lastMessage &&
        lastMessage.fromMe &&
        lastMessage.body === formattedBody
      ) {
        await ticket.update({ lastMessage: body });
        return lastMessage as WbotMessage;
      }
    } catch (checkErr) {
      logger.warn(`Failed to verify sent message: ${checkErr}`);
    }

    logger.warn(`Error sending WhatsApp message: ${err}`);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMessage;