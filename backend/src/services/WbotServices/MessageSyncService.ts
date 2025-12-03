/**
 * Servicio de Sincronización de Mensajes para WhatsApp
 *
 * Maneja la sincronización de mensajes al reconectar, evitando:
 * - Duplicados en la base de datos
 * - Procesamiento de mensajes muy antiguos
 * - Sobrecarga del sistema con muchos mensajes
 */

import { Client, Message as WbotMessage, Chat } from "whatsapp-web.js";
import { Op } from "sequelize";
import * as Sentry from "@sentry/node";
import Message from "../../models/Message";
import Whatsapp from "../../models/Whatsapp";
import { logger } from "../../utils/logger";
import { handleMessage } from "./wbotMessageListener";

interface Session extends Client {
  id?: number;
}

interface SyncConfig {
  // Máximo de mensajes por chat a sincronizar
  maxMessagesPerChat: number;
  // Máximo de chats a procesar
  maxChatsToProcess: number;
  // Antigüedad máxima de mensajes en horas (ignora mensajes más antiguos)
  maxMessageAgeHours: number;
  // Delay entre procesamiento de chats (ms) para no sobrecargar
  delayBetweenChats: number;
  // Intentar marcar como leído
  markAsSeen: boolean;
  // Crear tickets cerrados para mensajes leídos
  createClosedForRead: boolean;
  // Modo de sincronización: 'unread' solo no leídos, 'all' todos los mensajes
  mode: "unread" | "all";
}

interface SyncResult {
  chatsProcessed: number;
  messagesFound: number;
  messagesNew: number;
  messagesDuplicate: number;
  messagesSkippedOld: number;
  errors: number;
  duration: number;
  mode: "unread" | "all";
}

// Configuración por defecto
const DEFAULT_CONFIG: SyncConfig = {
  maxMessagesPerChat: 50,
  maxChatsToProcess: 100,
  maxMessageAgeHours: 24, // Solo mensajes de las últimas 24 horas
  delayBetweenChats: 100,
  markAsSeen: true,
  createClosedForRead: true,
  mode: "unread"
};

/**
 * Obtiene la configuración de sincronización para una instancia específica
 */
export const getSyncConfigForWhatsApp = async (
  whatsappId: number
): Promise<SyncConfig> => {
  try {
    const whatsapp = await Whatsapp.findByPk(whatsappId);
    if (whatsapp) {
      return {
        maxMessagesPerChat:
          whatsapp.syncMaxMessagesPerChat || DEFAULT_CONFIG.maxMessagesPerChat,
        maxChatsToProcess:
          whatsapp.syncMaxChats || DEFAULT_CONFIG.maxChatsToProcess,
        maxMessageAgeHours:
          whatsapp.syncMaxMessageAgeHours || DEFAULT_CONFIG.maxMessageAgeHours,
        delayBetweenChats:
          whatsapp.syncDelayBetweenChats || DEFAULT_CONFIG.delayBetweenChats,
        markAsSeen:
          whatsapp.syncMarkAsSeen !== null
            ? whatsapp.syncMarkAsSeen
            : DEFAULT_CONFIG.markAsSeen,
        createClosedForRead:
          whatsapp.syncCreateClosedForRead !== null
            ? whatsapp.syncCreateClosedForRead
            : DEFAULT_CONFIG.createClosedForRead,
        mode: DEFAULT_CONFIG.mode
      };
    }
  } catch (err) {
    logger.warn(`[Sync] No se pudo obtener config de WhatsApp ${whatsappId}`);
  }
  return { ...DEFAULT_CONFIG };
};

/**
 * Obtiene la configuración de sincronización (configuración por defecto)
 */
export const getSyncConfig = (): SyncConfig => {
  return { ...DEFAULT_CONFIG };
};

/**
 * Verifica si un mensaje es demasiado antiguo para sincronizar
 */
const isMessageTooOld = (msg: WbotMessage, maxAgeHours: number): boolean => {
  if (!msg.timestamp) return false;

  const messageDate = new Date(msg.timestamp * 1000);
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - maxAgeHours);

  return messageDate < cutoffDate;
};

/**
 * Obtiene IDs de mensajes que ya existen en la base de datos
 */
const getExistingMessageIds = async (
  messageIds: string[]
): Promise<Set<string>> => {
  if (messageIds.length === 0) return new Set();

  const existing = await Message.findAll({
    where: { id: { [Op.in]: messageIds } },
    attributes: ["id"],
    raw: true
  });

  return new Set(existing.map(m => m.id));
};

/**
 * Filtra y prepara mensajes para sincronización
 */
const filterMessagesForSync = async (
  messages: WbotMessage[],
  config: SyncConfig
): Promise<{
  toProcess: WbotMessage[];
  skippedOld: number;
  skippedDuplicate: number;
}> => {
  // Filtrar por antigüedad
  const recentMessages = messages.filter(
    msg => !isMessageTooOld(msg, config.maxMessageAgeHours)
  );
  const skippedOld = messages.length - recentMessages.length;

  // Obtener IDs existentes
  const messageIds = recentMessages.map(msg => msg.id.id);
  const existingIds = await getExistingMessageIds(messageIds);

  // Filtrar duplicados y ordenar por timestamp
  const newMessages = recentMessages
    .filter(msg => !existingIds.has(msg.id.id))
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  return {
    toProcess: newMessages,
    skippedOld,
    skippedDuplicate: recentMessages.length - newMessages.length
  };
};

/**
 * Intenta marcar un chat como leído de forma segura
 */
const markChatAsSeenSafe = async (
  wbot: Session,
  chat: Chat
): Promise<boolean> => {
  try {
    // Verificar si sendSeen está disponible
    type WWebJSWindow = { WWebJS?: { sendSeen?: () => void } };
    const isSendSeenAvailable = await wbot.pupPage?.evaluate(
      () =>
        typeof (window as unknown as WWebJSWindow).WWebJS?.sendSeen ===
        "function"
    );

    if (!isSendSeenAvailable) {
      // Intentar reinyectar Utils
      try {
        // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
        const utils = require("whatsapp-web.js/src/util/Injected/Utils");
        await wbot.pupPage?.evaluate(utils.LoadUtils);
      } catch {
        return false;
      }
    }

    await chat.sendSeen();
    return true;
  } catch (err) {
    logger.debug(`[Sync] No se pudo marcar chat como leído: ${err}`);
    return false;
  }
};

/**
 * Procesa un solo mensaje durante la sincronización
 * @param isAlreadyRead - true si el mensaje ya fue leído (para crear ticket cerrado)
 */
const processMessageSafe = async (
  msg: WbotMessage,
  wbot: Session,
  isAlreadyRead: boolean = false
): Promise<{ success: boolean; duplicate: boolean }> => {
  try {
    // Verificar una vez más si existe (por si acaso hubo concurrencia)
    const exists = await Message.findByPk(msg.id.id);
    if (exists) {
      return { success: true, duplicate: true };
    }

    // Asegurar que body no sea undefined
    if (!msg.body) {
      msg.body = "";
    }

    // Procesar mensaje con opciones de sincronización
    await handleMessage(msg, wbot, { isSync: true, isAlreadyRead });
    return { success: true, duplicate: false };
  } catch (err: unknown) {
    const error = err as { name?: string; message?: string };

    // Duplicado en base de datos es esperado y no es un error
    if (error.name === "SequelizeUniqueConstraintError") {
      return { success: true, duplicate: true };
    }

    logger.error(
      `[Sync] Error procesando mensaje ${msg.id.id}: ${error.message}`
    );
    Sentry.captureException(err);
    return { success: false, duplicate: false };
  }
};

/**
 * Sincroniza mensajes de un chat específico
 */
const syncChatMessages = async (
  wbot: Session,
  chat: Chat,
  config: SyncConfig
): Promise<{
  found: number;
  new: number;
  duplicate: number;
  skippedOld: number;
  errors: number;
}> => {
  const result = { found: 0, new: 0, duplicate: 0, skippedOld: 0, errors: 0 };

  try {
    // Determinar límite según el modo
    let limit: number;
    if (config.mode === "all") {
      // Modo ALL: obtener hasta maxMessagesPerChat mensajes
      limit = config.maxMessagesPerChat;
    } else {
      // Modo UNREAD: obtener solo mensajes no leídos
      limit = Math.min(chat.unreadCount || 0, config.maxMessagesPerChat);
      if (limit === 0) return result; // No hay mensajes no leídos
    }

    const messages = await chat.fetchMessages({ limit });
    result.found = messages.length;

    // Determinar si los mensajes ya fueron leídos
    // En modo "all": si unreadCount es 0, todos los mensajes ya fueron leídos
    // En modo "unread": los mensajes no están leídos
    const chatUnreadCount = chat.unreadCount || 0;
    const isAlreadyRead = config.mode === "all" && chatUnreadCount === 0;

    // Filtrar mensajes
    const { toProcess, skippedOld, skippedDuplicate } =
      await filterMessagesForSync(messages, config);

    result.skippedOld = skippedOld;
    result.duplicate = skippedDuplicate;

    // Procesar mensajes nuevos
    for (const msg of toProcess) {
      // Determinar si este mensaje específico ya fue leído
      // Si el chat tiene mensajes no leídos, los últimos N mensajes (hasta unreadCount) no están leídos
      // msg.fromMe = true significa que lo enviamos nosotros, siempre "leído" por el contacto
      const msgIsRead = msg.fromMe || isAlreadyRead;

      const { success, duplicate } = await processMessageSafe(
        msg,
        wbot,
        msgIsRead
      );

      if (duplicate) {
        result.duplicate += 1;
      } else if (success) {
        result.new += 1;
      } else {
        result.errors += 1;
      }
    }

    // Marcar como leído si está habilitado
    if (config.markAsSeen && chat.unreadCount > 0) {
      await markChatAsSeenSafe(wbot, chat);
    }
  } catch (err) {
    logger.error(`[Sync] Error sincronizando chat: ${err}`);
    result.errors += 1;
  }

  return result;
};

/**
 * Sincroniza todos los mensajes no leídos de forma inteligente
 */
export const syncUnreadMessagesImproved = async (
  wbot: Session,
  customConfig?: Partial<SyncConfig>
): Promise<SyncResult> => {
  const startTime = Date.now();
  const config = { ...getSyncConfig(), ...customConfig };

  const result: SyncResult = {
    chatsProcessed: 0,
    messagesFound: 0,
    messagesNew: 0,
    messagesDuplicate: 0,
    messagesSkippedOld: 0,
    errors: 0,
    duration: 0,
    mode: config.mode
  };

  logger.info(
    `[Sync:${wbot.id}] Iniciando sincronización (modo: ${config.mode})...`
  );
  logger.debug(`[Sync:${wbot.id}] Config: ${JSON.stringify(config)}`);

  try {
    // Obtener todos los chats
    const allChats = await wbot.getChats();

    // Filtrar chats según el modo
    let chatsToProcess: Chat[];

    if (config.mode === "all") {
      // Modo ALL: procesar todos los chats ordenados por actividad reciente
      chatsToProcess = allChats.slice(0, config.maxChatsToProcess);
      logger.info(
        `[Sync:${wbot.id}] Modo ALL: procesando ${chatsToProcess.length} chats`
      );
    } else {
      // Modo UNREAD: solo chats con mensajes no leídos
      chatsToProcess = allChats
        .filter(chat => chat.unreadCount > 0)
        .sort((a, b) => b.unreadCount - a.unreadCount)
        .slice(0, config.maxChatsToProcess);
      logger.info(
        `[Sync:${wbot.id}] Modo UNREAD: ${chatsToProcess.length} chats con mensajes no leídos`
      );
    }

    // Procesar cada chat
    for (const chat of chatsToProcess) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-underscore-dangle
      const chatId = (chat.id as any)?._serialized || chat.id;
      logger.debug(
        `[Sync:${wbot.id}] Procesando chat ${chatId} ` +
          `(${chat.unreadCount} no leídos, modo: ${config.mode})`
      );

      const chatResult = await syncChatMessages(wbot, chat, config);

      result.chatsProcessed += 1;
      result.messagesFound += chatResult.found;
      result.messagesNew += chatResult.new;
      result.messagesDuplicate += chatResult.duplicate;
      result.messagesSkippedOld += chatResult.skippedOld;
      result.errors += chatResult.errors;

      // Delay entre chats para no sobrecargar
      if (config.delayBetweenChats > 0) {
        await new Promise(resolve =>
          setTimeout(resolve, config.delayBetweenChats)
        );
      }
    }
  } catch (err) {
    logger.error(`[Sync:${wbot.id}] Error general en sincronización: ${err}`);
    Sentry.captureException(err);
    result.errors += 1;
  }

  result.duration = Date.now() - startTime;

  logger.info(
    `[Sync:${wbot.id}] Sincronización completada en ${result.duration}ms: ` +
      `${result.chatsProcessed} chats, ${result.messagesNew} nuevos, ` +
      `${result.messagesDuplicate} duplicados, ${result.messagesSkippedOld} antiguos, ` +
      `${result.errors} errores`
  );

  return result;
};

/**
 * Verifica si un mensaje específico ya existe
 */
export const messageExists = async (messageId: string): Promise<boolean> => {
  const message = await Message.findByPk(messageId, {
    attributes: ["id"]
  });
  return message !== null;
};

/**
 * Obtiene estadísticas de mensajes duplicados recientes
 */
export const getDuplicateStats = async (
  hours: number = 24
): Promise<{ total: number; duplicatesAvoided: number }> => {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - hours);

  const total = await Message.count({
    where: {
      createdAt: { [Op.gte]: cutoff }
    }
  });

  // No tenemos una forma directa de saber cuántos duplicados evitamos,
  // pero podemos contar mensajes únicos vs intentos
  return { total, duplicatesAvoided: 0 };
};

export default {
  syncUnreadMessagesImproved,
  messageExists,
  getDuplicateStats,
  getSyncConfig
};
