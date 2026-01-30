import Ticket from "../../models/Ticket";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import User from "../../models/User";
import Queue from "../../models/Queue";
import Whatsapp from "../../models/Whatsapp";
import ShowUserService from "../UserServices/ShowUserService";

interface Request {
  id: string | number;
  userId?: string;
}

const ShowTicketService = async (
  id: string | number | Request,
  userId?: string
): Promise<Ticket> => {
  // Soportar tanto el formato antiguo ShowTicketService(id) como el nuevo ShowTicketService({id, userId})
  let ticketId: string | number;
  let requestUserId: string | undefined;

  if (typeof id === "object") {
    ticketId = id.id;
    requestUserId = id.userId;
  } else {
    ticketId = id;
    requestUserId = userId;
  }

  const ticket = await Ticket.findByPk(ticketId, {
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number", "email", "profilePicUrl"],
        include: ["extraInfo", "tags"]
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name"]
      },
      {
        model: Queue,
        as: "queue",
        attributes: ["id", "name", "color"]
      },
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["name"]
      }
    ]
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  // Validar permisos si se proporciona userId
  if (requestUserId) {
    const user = await ShowUserService(requestUserId);
    const userQueueIds = user.queues.map(queue => queue.id);
    const isAdmin = user.profile === "admin";
    const canViewAll = isAdmin || user.allTicket === "enabled";

    // Verificar si el usuario tiene permiso para ver este ticket
    const isAssignedToUser = ticket.userId === parseInt(requestUserId);
    const isInUserQueue = ticket.queueId && userQueueIds.includes(ticket.queueId);
    const isPending = ticket.status === "pending";

    const hasPermission = canViewAll || isAssignedToUser || isInUserQueue || isPending;

    if (!hasPermission) {
      throw new AppError("ERR_NO_PERMISSION", 403);
    }
  }

  return ticket;
};

export default ShowTicketService;
