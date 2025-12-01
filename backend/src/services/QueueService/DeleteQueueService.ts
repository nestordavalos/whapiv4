import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import ShowQueueService from "./ShowQueueService";

const DeleteQueueService = async (queueId: number | string): Promise<void> => {
  const queue = await ShowQueueService(queueId);

  // Verificar si hay tickets activos asociados a esta cola
  const activeTickets = await Ticket.count({
    where: {
      queueId: queue.id,
      status: ["open", "pending"]
    }
  });

  if (activeTickets > 0) {
    throw new AppError(
      `ERR_QUEUE_HAS_ACTIVE_TICKETS: ${activeTickets} ticket(s) activo(s)`,
      400
    );
  }

  await queue.destroy();
};

export default DeleteQueueService;
