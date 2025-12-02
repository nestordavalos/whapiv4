import { getIO } from "../../libs/socket";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";

interface MessageEditData {
  messageId: string;
  newBody: string;
  fromMe: boolean;
}

/**
 * Service to handle message edit events from WhatsApp
 * This handles edits for both own messages (fromMe) and messages from contacts
 */
const HandleMessageEditService = async ({
  messageId,
  newBody,
  fromMe
}: MessageEditData): Promise<void> => {
  const io = getIO();

  try {
    const message = await Message.findByPk(messageId, {
      include: [
        "contact",
        {
          model: Ticket,
          as: "ticket",
          include: ["contact"]
        },
        {
          model: Message,
          as: "quotedMsg",
          include: ["contact"]
        }
      ]
    });

    if (!message) {
      logger.warn(
        `[MessageEdit] Mensaje no encontrado en la base de datos: ${messageId}`
      );
      return;
    }

    // Update the message in the database
    await message.update({
      body: newBody,
      isEdited: true
    });

    // Reload the message with all associations
    await message.reload({
      include: [
        "contact",
        {
          model: Ticket,
          as: "ticket",
          include: ["contact"]
        },
        {
          model: Message,
          as: "quotedMsg",
          include: ["contact"]
        }
      ]
    });

    const bodyPreview = newBody.substring(0, 50);
    logger.info(
      `[MessageEdit] Mensaje actualizado: id=${messageId}, fromMe=${fromMe}, newBody="${bodyPreview}..."`
    );

    // Emit socket event to update the UI in real-time
    io.to(message.ticketId.toString()).emit("appMessage", {
      action: "update",
      message
    });

    // Also update ticket's lastMessage if this was the last message
    const { ticket } = message;
    if (ticket) {
      const lastMessage = await Message.findOne({
        where: { ticketId: ticket.id },
        order: [["createdAt", "DESC"]]
      });

      if (lastMessage && lastMessage.id === message.id) {
        const prefix = message.fromMe ? "🢅" : "🢇";
        await ticket.update({
          lastMessage: `${prefix} ⠀ ${newBody}`
        });

        io.to(ticket.status).to(ticket.id.toString()).emit("ticket", {
          action: "update",
          ticket
        });
      }
    }
  } catch (err) {
    logger.error(`[MessageEdit] Error procesando edición: ${err}`);
    throw err;
  }
};

export default HandleMessageEditService;
