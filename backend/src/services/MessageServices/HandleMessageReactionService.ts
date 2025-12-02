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

// Construye variantes del ID para tolerar formatos distintos (id puro, _serialized, sin sufijos)
const buildIdCandidates = (rawId: string): string[] => {
  const candidates = new Set<string>();
  candidates.add(rawId);

  // Si viene como remote_id o remote_id@server, probar cada parte
  rawId.split("_").forEach(part => candidates.add(part));
  rawId.split("@").forEach(part => candidates.add(part));

  return Array.from(candidates).filter(Boolean);
};

const messageInclude = [
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
];

const HandleMessageReactionService = async ({
  reactionData
}: Request): Promise<MessageReaction | null> => {
  const { messageId, emoji, senderId, senderName, fromMe } = reactionData;

  // Busqueda tolerante a formatos de ID
  const tryFindMessage = async (id: string) =>
    Message.findByPk(id, { include: messageInclude });

  const tryFindMessageLike = async (id: string) =>
    Message.findOne({
      where: { id: { [Op.like]: `%${id}%` } },
      include: messageInclude
    });

  const idCandidates = buildIdCandidates(messageId);
  let message: Message | null = null;

  // Intento exacto con cada candidato
  // eslint-disable-next-line no-restricted-syntax
  for (const candidate of idCandidates) {
    // eslint-disable-next-line no-await-in-loop
    const found = await tryFindMessage(candidate);
    if (found) {
      message = found;
      break;
    }
  }

  // Si no se encuentra, probar con coincidencia parcial
  if (!message) {
    // eslint-disable-next-line no-restricted-syntax
    for (const candidate of idCandidates) {
      // eslint-disable-next-line no-await-in-loop
      const found = await tryFindMessageLike(candidate);
      if (found) {
        message = found;
        break;
      }
    }
  }

  if (!message) {
    logger.warn(`[Reaction] Mensaje no encontrado: ${messageId}`);
    return null;
  }

  logger.info(
    `[Reaction] Mensaje encontrado: ${message.id} para reaccion de ${messageId}`
  );

  const io = getIO();
  const actualMessageId = message.id; // Usar el ID real del mensaje encontrado

  // Si el emoji esta vacio, significa que se quito la reaccion
  if (!emoji) {
    const deleted = await MessageReaction.destroy({
      where: {
        messageId: actualMessageId,
        senderId
      }
    });

    if (deleted > 0) {
      logger.info(
        `[Reaction] Reaccion eliminada del mensaje ${actualMessageId}`
      );

      // Emitir evento de reaccion eliminada
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

  // Buscar si ya existe una reaccion de este usuario para este mensaje
  const existingReaction = await MessageReaction.findOne({
    where: {
      messageId: actualMessageId,
      senderId
    }
  });

  let reaction: MessageReaction;

  if (existingReaction) {
    // Actualizar la reaccion existente
    await existingReaction.update({
      emoji,
      senderName: senderName || existingReaction.senderName
    });
    reaction = existingReaction;
    logger.info(
      `[Reaction] Reaccion actualizada: ${emoji} en mensaje ${actualMessageId}`
    );
  } else {
    // Crear nueva reaccion
    reaction = await MessageReaction.create({
      messageId: actualMessageId,
      emoji,
      senderId,
      senderName,
      fromMe
    });
    logger.info(
      `[Reaction] Nueva reaccion: ${emoji} en mensaje ${actualMessageId}`
    );
  }

  // Emitir evento de nueva reaccion o actualizacion
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
