import { getIO } from "../../libs/socket";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import { logger } from "../../utils/logger";

interface MessageData {
  id: string;
  ticketId: number;
  body: string;
  ack?: number | null;
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
  const normalizedMessageData = {
    ...messageData,
    ack: Number.isInteger(messageData.ack) ? messageData.ack : 0
  };

  // Buscar o crear mensaje de forma atómica para evitar duplicados
  const [message, created] = await Message.findOrCreate({
    where: { id: normalizedMessageData.id },
    defaults: normalizedMessageData
  });

  if (created) {
    // Recargar asociaciones solo cuando se emitirá el evento.
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
    logger.debug(
      `[CreateMessage] Mensaje ${message.id} ya existía, no se emite socket`
    );
  }

  return message;
};

export default CreateMessageService;
