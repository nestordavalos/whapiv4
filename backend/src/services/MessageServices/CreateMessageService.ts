import { getIO } from "../../libs/socket";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";

export interface CreateMessageData {
  id: string;
  ticketId: number;
  body: string;
  contactId?: number;
  fromMe?: boolean;
  read?: boolean;
  mediaType?: string;
  mediaUrl?: string;
  quotedMsgId?: string;
  ack?: number;
  createdAt?: Date;
}

interface Request {
  messageData: CreateMessageData;
}

const CreateMessageService = async ({ messageData }: Request): Promise<Message> => {
  // 🔍 Log inicial del contenido que se intenta guardar
  console.log(
    "🔄 CreateMessageService - messageData:",
    JSON.stringify(messageData, null, 2)
  );

  // Verificar si el mensaje ya existe para evitar reenviarlo a los clientes
  const exists = await Message.findByPk(messageData.id);

  if (exists && Object.prototype.hasOwnProperty.call(messageData, "createdAt")) {
    delete messageData.createdAt;
  }

  // Guardar o actualizar mensaje
  await Message.upsert(messageData);

  // Intentar recuperar el mensaje completo con relaciones
  const message = await Message.findByPk(messageData.id, {
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

  if (!message) {
    console.error("❌ No se encontró el mensaje luego de upsert. ID:", messageData.id);
    throw new Error("ERR_CREATING_MESSAGE");
  }

  const io = getIO();

  if (!exists) {
    io.to(message.ticketId.toString())
      .to(message.ticket.status)
      .to("notification")
      .emit("appMessage", {
        action: "create",
        message,
        ticket: message.ticket,
        contact: message.ticket.contact
      });
  }

  return message;
};

export default CreateMessageService;
