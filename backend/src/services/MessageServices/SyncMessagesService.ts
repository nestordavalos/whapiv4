import { Op } from "sequelize";
import { Message as WbotMessage } from "whatsapp-web.js";
import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import ShowTicketService from "../TicketServices/ShowTicketService";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import { handleMessage } from "../WbotServices/wbotMessageListener";
import { logger } from "../../utils/logger";

interface Request {
  ticketId: string;
  limit?: number;
}

interface Response {
  synced: number;
  total: number;
  todayOnly: boolean;
  message: string;
}

/**
 * Sincroniza mensajes faltantes del WhatsApp hacia la base de datos
 * Solo recupera mensajes del día actual para evitar saturación
 * 1. Obtiene los mensajes del chat de WhatsApp
 * 2. Filtra solo los mensajes de hoy
 * 3. Compara con los mensajes existentes en la BD
 * 4. Importa solo los mensajes faltantes
 */
const SyncMessagesService = async ({
  ticketId,
  limit = 50
}: Request): Promise<Response> => {
  const ticket = await ShowTicketService(ticketId);

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const wbot = await GetTicketWbot(ticket);
  const chatId = `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`;

  // Obtener el inicio del día actual (medianoche)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartTimestamp = Math.floor(todayStart.getTime() / 1000);

  // Obtener el chat y los mensajes de WhatsApp
  const wbotChat = await wbot.getChatById(chatId);

  // Cargar mensajes del chat (límite reducido para evitar saturación)
  const wbotMessages: WbotMessage[] = await wbotChat.fetchMessages({
    limit
  });

  // Filtrar solo mensajes de hoy
  const todayMessages = wbotMessages.filter(
    msg => (msg.timestamp || 0) >= todayStartTimestamp
  );

  logger.info(
    `[SyncMessages] Obtenidos ${wbotMessages.length} mensajes, ${todayMessages.length} son de hoy`
  );

  // Obtener IDs de mensajes existentes en la BD para este contacto/whatsapp
  const tickets = await Ticket.findAll({
    where: {
      contactId: ticket.contactId,
      whatsappId: ticket.whatsappId
    },
    attributes: ["id"]
  });
  const ticketIds = tickets.map(t => t.id);

  const existingMessages = await Message.findAll({
    where: {
      ticketId: { [Op.in]: ticketIds }
    },
    attributes: ["id"],
    raw: true
  });

  const existingIds = new Set(existingMessages.map(m => m.id));

  // Filtrar mensajes nuevos de hoy (que no existen en la BD)
  const newMessages = todayMessages
    .filter(msg => !existingIds.has(msg.id.id))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter(msg => !(msg as any).isNotification) // Excluir notificaciones del sistema
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)); // Ordenar por timestamp

  let syncedCount = 0;

  // Procesar cada mensaje nuevo
  for (const msg of newMessages) {
    try {
      // Asegurar que el mensaje tenga un body (puede estar vacío para media)
      if (!msg.body && !msg.hasMedia) {
        // eslint-disable-next-line no-continue
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await handleMessage(msg, wbot as any, true); // isSync = true
      syncedCount += 1;

      logger.debug(`[SyncMessages] Mensaje sincronizado: ${msg.id.id}`);
    } catch (err) {
      // Ignorar errores de duplicados
      if (err.name === "SequelizeUniqueConstraintError") {
        logger.debug(`[SyncMessages] Mensaje ya existe: ${msg.id.id}`);
        // eslint-disable-next-line no-continue
        continue;
      }
      logger.error(`[SyncMessages] Error procesando mensaje: ${err.message}`);
    }
  }

  let message = "";
  if (syncedCount > 0) {
    message = `Se sincronizaron ${syncedCount} mensajes de hoy`;
  } else if (todayMessages.length === 0) {
    message = "No hay mensajes de hoy en WhatsApp para sincronizar";
  } else {
    message = "No hay mensajes nuevos de hoy para sincronizar";
  }

  return {
    synced: syncedCount,
    total: todayMessages.length,
    todayOnly: true,
    message
  };
};

export default SyncMessagesService;
