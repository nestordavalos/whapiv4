import AppError from "../../errors/AppError";
import GetWbotMessage from "../../helpers/GetWbotMessage";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";

// Tiempo máximo para editar un mensaje (15 minutos en milisegundos)
const MAX_EDIT_TIME_MS = 15 * 60 * 1000;

interface EditMessageRequest {
  messageId: string;
  newBody: string;
}

const EditWhatsAppMessage = async ({
  messageId,
  newBody
}: EditMessageRequest): Promise<Message> => {
  const message = await Message.findByPk(messageId, {
    include: [
      {
        model: Ticket,
        as: "ticket",
        include: ["contact"]
      }
    ]
  });

  if (!message) {
    throw new AppError("ERR_MESSAGE_NOT_FOUND", 404);
  }

  // Verificar que el mensaje sea propio (fromMe)
  if (!message.fromMe) {
    throw new AppError("ERR_EDIT_ONLY_OWN_MESSAGES", 403);
  }

  // Verificar que no sea un mensaje eliminado
  if (message.isDeleted) {
    throw new AppError("ERR_CANNOT_EDIT_DELETED_MESSAGE", 400);
  }

  // Verificar que sea un mensaje de texto (no media)
  if (message.mediaType && message.mediaType !== "chat") {
    throw new AppError("ERR_CANNOT_EDIT_MEDIA_MESSAGE", 400);
  }

  // Verificar el tiempo transcurrido desde la creación del mensaje
  const messageCreatedAt = new Date(message.createdAt).getTime();
  const currentTime = Date.now();
  const elapsedTime = currentTime - messageCreatedAt;

  if (elapsedTime > MAX_EDIT_TIME_MS) {
    throw new AppError("ERR_MESSAGE_EDIT_TIME_EXPIRED", 400);
  }

  const { ticket } = message;

  // Obtener el mensaje de WhatsApp
  const wbotMessage = await GetWbotMessage(ticket, messageId);

  try {
    // Editar el mensaje en WhatsApp usando la API de whatsapp-web.js
    await wbotMessage.edit(newBody);
  } catch (err: any) {
    logger.error(`Error editing WhatsApp message: ${err}`);
    throw new AppError("ERR_EDIT_WAPP_MSG", 500);
  }

  // Actualizar el mensaje en la base de datos
  await message.update({
    body: newBody,
    isEdited: true
  });

  await message.reload({
    include: [
      {
        model: Ticket,
        as: "ticket",
        include: ["contact"]
      }
    ]
  });

  return message;
};

export default EditWhatsAppMessage;
