import { Op, Sequelize } from "sequelize";
import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import MessageReaction from "../../models/MessageReaction";
import Ticket from "../../models/Ticket";
import ShowTicketService from "../TicketServices/ShowTicketService";

interface Request {
  ticketId: string;
  pageNumber?: string;
  userId?: string;
}

interface Response {
  messages: Message[];
  ticket: Ticket;
  count: number;
  hasMore: boolean;
}

const ListMessagesService = async ({
  pageNumber = "1",
  ticketId,
  userId
}: Request): Promise<Response> => {
  const ticket = userId
    ? await ShowTicketService({ id: ticketId, userId })
    : await ShowTicketService(ticketId);

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const limit = 100;
  const currentPage = Math.max(parseInt(pageNumber, 10) || 1, 1);
  const queryLimit = limit * currentPage;

  // Optimized: Use subquery instead of separate query + IN clause
  // This reduces database round trips and is more efficient
  const messages = await Message.findAll({
    where: {
      ticketId: {
        [Op.in]: Sequelize.literal(`(
          SELECT id FROM Tickets 
          WHERE contactId = ${ticket.contactId} 
          AND whatsappId = ${ticket.whatsappId}
        )`)
      }
    },
    limit: queryLimit + 1,
    include: [
      "contact",
      "ticket",
      {
        model: Message,
        as: "quotedMsg",
        include: ["contact"]
      },
      {
        model: MessageReaction,
        as: "reactions"
      }
    ],
    order: [
      ["createdAt", "DESC"],
      ["id", "DESC"]
    ]
  });

  const hasMore = messages.length > queryLimit;
  if (hasMore) {
    messages.pop();
  }

  return {
    messages: messages.reverse(),
    ticket,
    count: messages.length + (hasMore ? 1 : 0),
    hasMore
  };
};

export default ListMessagesService;
