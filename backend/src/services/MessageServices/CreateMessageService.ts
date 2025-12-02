import { getIO } from "../../libs/socket";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import { logger } from "../../utils/logger";

interface MessageData {
  id: string;
  ticketId: number;
  body: string;
  contactId?: number;
  fromMe?: boolean;
  read?: boolean;
  mediaType?: string;
  mediaUrl?: string;
  quotedMsgId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Request {
  messageData: MessageData;
}

const CreateMessageService = async ({
  messageData
}: Request): Promise<Message> => {
  // Buscar o crear mensaje de forma atómica para evitar duplicados
  const [message, created] = await Message.findOrCreate({
    where: { id: messageData.id },
    defaults: messageData
  });

  // Recargar las asociaciones necesarias
  await message.reload({
    include: [
      "contact",
      {
        model: Ticket,
        as: "ticket",
        include: [
          "contact",
          "queue",
          {
            model: Whatsapp,
            as: "whatsapp",
            attributes: ["name"]
          }
        ]
      },
      {
        model: Message,
        as: "quotedMsg",
        include: ["contact"]
      }
    ]
  });

  if (created) {
    const io = getIO();
    logger.info(
      `[CreateMessage] Emitiendo socket para mensaje ${message.id} en ticket ${message.ticketId} (status: ${message.ticket.status})`
    );
    io.to(message.ticketId.toString())
      .to(message.ticket.status)
      .to("notification")
      .emit("appMessage", {
        action: "create",
        message,
        ticket: message.ticket,
        contact: message.ticket.contact
      });
  } else {
    logger.debug(`[CreateMessage] Mensaje ${message.id} ya existía, no se emite socket`);
  }

  return message;
};

export default CreateMessageService;
