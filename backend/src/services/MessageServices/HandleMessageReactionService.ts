import { Op } from "sequelize";
import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import MessageReaction from "../../models/MessageReaction";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";

interface ReactionData {
  messageId: string;
  emoji: string;
  senderId: string;
  senderName?: string;
  fromMe: boolean;
}

interface Request {
  reactionData: ReactionData;
}

/**
 * Crea o actualiza una reacción de mensaje.
 * Si el emoji está vacío, elimina la reacción existente del usuario.
 * Si ya existe una reacción del mismo usuario, la actualiza.
 */
const HandleMessageReactionService = async ({
  reactionData
}: Request): Promise<MessageReaction | null> => {
  const { messageId, emoji, senderId, senderName, fromMe } = reactionData;

  // Buscar el mensaje original - intentar búsqueda exacta y parcial
  let message = await Message.findByPk(messageId, {
    include: [
      {
        model: Ticket,
        as: "ticket",
        include: [
          {
            model: Contact,
            as: "contact",
            attributes: ["id", "name", "number", "profilePicUrl"]
          }
        ]
      }
    ]
  });

  // Si no se encuentra, buscar por coincidencia parcial (el ID puede tener diferentes formatos)
  if (!message) {
    message = await Message.findOne({
      where: {
        id: {
          [Op.like]: `%${messageId}%`
        }
      },
      include: [
        {
          model: Ticket,
          as: "ticket",
          include: [
            {
              model: Contact,
              as: "contact",
              attributes: ["id", "name", "number", "profilePicUrl"]
            }
          ]
        }
      ]
    });
  }

  // También intentar buscar si messageId contiene el ID del mensaje
  if (!message && messageId.includes("_")) {
    const possibleId = messageId.split("_").pop();
    if (possibleId) {
      message = await Message.findOne({
        where: {
          id: {
            [Op.like]: `%${possibleId}%`
          }
        },
        include: [
          {
            model: Ticket,
            as: "ticket",
            include: [
              {
                model: Contact,
                as: "contact",
                attributes: ["id", "name", "number", "profilePicUrl"]
              }
            ]
          }
        ]
      });
    }
  }

  if (!message) {
    logger.warn(`[Reaction] Mensaje no encontrado: ${messageId}`);
    return null;
  }

  logger.info(
    `[Reaction] Mensaje encontrado: ${message.id} para reacción de ${messageId}`
  );

  const io = getIO();
  const actualMessageId = message.id; // Usar el ID real del mensaje encontrado

  // Si el emoji está vacío, significa que se quitó la reacción
  if (!emoji) {
    const deleted = await MessageReaction.destroy({
      where: {
        messageId: actualMessageId,
        senderId
      }
    });

    if (deleted > 0) {
      logger.info(
        `[Reaction] Reacción eliminada del mensaje ${actualMessageId}`
      );

      // Emitir evento de reacción eliminada
      io.to(message.ticketId.toString())
        .to(message.ticket.status)
        .emit("appMessage", {
          action: "reactionRemoved",
          messageId: actualMessageId,
          senderId,
          ticketId: message.ticketId
        });
    }

    return null;
  }

  // Buscar si ya existe una reacción de este usuario para este mensaje
  const existingReaction = await MessageReaction.findOne({
    where: {
      messageId: actualMessageId,
      senderId
    }
  });

  let reaction: MessageReaction;

  if (existingReaction) {
    // Actualizar la reacción existente
    await existingReaction.update({
      emoji,
      senderName: senderName || existingReaction.senderName
    });
    reaction = existingReaction;
    logger.info(
      `[Reaction] Reacción actualizada: ${emoji} en mensaje ${actualMessageId}`
    );
  } else {
    // Crear nueva reacción
    reaction = await MessageReaction.create({
      messageId: actualMessageId,
      emoji,
      senderId,
      senderName,
      fromMe
    });
    logger.info(
      `[Reaction] Nueva reacción: ${emoji} en mensaje ${actualMessageId}`
    );
  }

  // Emitir evento de nueva reacción o actualización
  io.to(message.ticketId.toString())
    .to(message.ticket.status)
    .to("notification")
    .emit("appMessage", {
      action: "reactionUpdate",
      reaction: {
        id: reaction.id,
        messageId: reaction.messageId,
        emoji: reaction.emoji,
        senderId: reaction.senderId,
        senderName: reaction.senderName,
        fromMe: reaction.fromMe
      },
      ticket: message.ticket,
      contact: message.ticket.contact,
      ticketId: message.ticketId
    });

  return reaction;
};

export default HandleMessageReactionService;
