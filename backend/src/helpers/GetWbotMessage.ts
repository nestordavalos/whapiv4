import { Message as WbotMessage } from "whatsapp-web.js";
import AppError from "../errors/AppError";
import Ticket from "../models/Ticket";
import GetTicketWbot from "./GetTicketWbot";
import { logger } from "../utils/logger";
import { getContactJid } from "./GetContactJid";
import { getFirstErrorLine } from "./WhatsAppWebErrors";

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message.split("\n")[0];
  return String(err).split("\n")[0];
};

export const GetWbotMessage = async (
  ticket: Ticket,
  messageId: string
): Promise<WbotMessage> => {
  const wbot = await GetTicketWbot(ticket);
  const targetChatId = getContactJid(ticket.contact.number, ticket.isGroup);

  const wbotChat = await wbot.getChatById(targetChatId);

  let limit = ticket.isGroup ? 50 : 20;
  const maxLimit = ticket.isGroup ? 300 : 100;
  const logContext = {
    ticketId: ticket.id,
    contactId: ticket.contactId,
    contactNumber: ticket.contact?.number,
    isGroup: ticket.isGroup,
    messageId,
    targetChatId
  };

  const fetchWbotMessagesGradually = async (): Promise<void | WbotMessage> => {
    try {
      const chatMessages = await wbotChat.fetchMessages({ limit });

      const msgFound = chatMessages.find(msg => msg.id.id === messageId);

      if (!msgFound && limit < maxLimit) {
        limit += ticket.isGroup ? 50 : 20;
        return fetchWbotMessagesGradually();
      }

      return msgFound;
    } catch (fetchError) {
      logger.error(
        {
          ...logContext,
          limit,
          maxLimit,
          error: getFirstErrorLine(fetchError)
        },
        "[GetWbotMessage] Error fetching messages"
      );
      return undefined;
    }
  };

  try {
    const msgFound = await fetchWbotMessagesGradually();

    if (!msgFound) {
      const errorMsg = ticket.isGroup
        ? `Não foi possível encontrar a mensagem nas últimas ${maxLimit} mensagens do grupo`
        : `Não foi possível encontrar a mensagem nas últimas ${maxLimit} mensagens`;

      logger.warn(errorMsg);
      logger.warn(
        {
          ...logContext,
          maxLimit
        },
        "[GetWbotMessage] Message not found in fetched WhatsApp history"
      );
      throw new AppError("ERR_FETCH_WAPP_MSG");
    }

    return msgFound;
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }

    logger.error(
      {
        ...logContext,
        error: getErrorMessage(err)
      },
      "[GetWbotMessage] Unexpected error"
    );
    throw new AppError("ERR_FETCH_WAPP_MSG");
  }
};

export default GetWbotMessage;
