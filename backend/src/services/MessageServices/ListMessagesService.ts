import { Op, Sequelize } from "sequelize";
import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import MessageReaction from "../../models/MessageReaction";
import Ticket from "../../models/Ticket";
import ShowTicketService from "../TicketServices/ShowTicketService";

interface Request {
  ticketId: string;
  pageNumber?: string;
}

interface Response {
  messages: Message[];
  ticket: Ticket;
  count: number;
  hasMore: boolean;
}

const ListMessagesService = async ({
  pageNumber = "1",
  ticketId
}: Request): Promise<Response> => {
  const ticket = await ShowTicketService(ticketId);

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  // Optimized: Use subquery instead of separate query + IN clause
  // This reduces database round trips and is more efficient
  const { count, rows: messages } = await Message.findAndCountAll({
    where: {
      ticketId: {
        [Op.in]: Sequelize.literal(`(
          SELECT id FROM Tickets 
          WHERE contactId = ${ticket.contactId} 
          AND whatsappId = ${ticket.whatsappId}
        )`)
      }
    },
    limit,
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
    offset,
    order: [["createdAt", "DESC"]]
  });

  const hasMore = count > offset + messages.length;
  return {
    messages: messages.reverse(),
    ticket,
    count,
    hasMore
  };
};

export default ListMessagesService;
