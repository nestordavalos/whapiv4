import { Request, Response } from "express";
import { getWbot, removeWbot } from "../libs/wbot";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";
import {
  syncUnreadMessagesImproved,
  getSyncConfigForWhatsApp
} from "../services/WbotServices/MessageSyncService";
import { logger } from "../utils/logger";

const store = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsapp = await ShowWhatsAppService(whatsappId);

  try {
    await StartWhatsAppSession(whatsapp);
  } catch (err) {
    logger.error(err);
  }

  return res.status(200).json({ message: "Starting session." });
};

const update = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;

  const { whatsapp } = await UpdateWhatsAppService({
    whatsappId,
    whatsappData: { session: "" }
  });

  try {
    await StartWhatsAppSession(whatsapp);
  } catch (err) {
    logger.error(err);
  }

  return res.status(200).json({ message: "Starting session." });
};

const remove = async (req: Request, res: Response): Promise<Response> => {
  logger.info("[WhatsAppSession] Recibiendo solicitud de desconexión...");
  const { whatsappId } = req.params;
  const whatsapp = await ShowWhatsAppService(whatsappId);

  try {
    logger.info(
      `[WhatsAppSession] Obteniendo instancia de WhatsApp ${whatsapp.id}...`
    );
    const wbot = getWbot(whatsapp.id);

    if (wbot && typeof wbot.logout === "function") {
      logger.info("[WhatsAppSession] Ejecutando logout con timeout...");

      // Crear promesa con timeout para evitar que se quede colgado
      const logoutWithTimeout = Promise.race([
        wbot.logout(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Logout timeout")), 10000)
        )
      ]);

      try {
        await logoutWithTimeout;
        logger.info("[WhatsAppSession] Logout completado exitosamente");
      } catch (logoutError) {
        logger.warn(
          `[WhatsAppSession] Error/timeout en logout: ${logoutError}`
        );
        // Continuar con destroy aunque logout falle
      }

      // Forzar destroy del cliente
      try {
        logger.info("[WhatsAppSession] Destruyendo cliente...");
        await Promise.race([
          wbot.destroy(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Destroy timeout")), 5000)
          )
        ]);
        logger.info("[WhatsAppSession] Cliente destruido");
      } catch (destroyError) {
        logger.warn(
          `[WhatsAppSession] Error/timeout en destroy: ${destroyError}`
        );
      }
    }
  } catch (error) {
    logger.warn(`[WhatsAppSession] Instancia no encontrada o error: ${error}`);
  }

  // Siempre limpiar la sesión del array
  try {
    removeWbot(whatsapp.id);
    logger.info(`[WhatsAppSession] Sesión ${whatsapp.id} removida del array`);
  } catch (removeError) {
    logger.warn(`[WhatsAppSession] Error removiendo sesión: ${removeError}`);
  }

  // Actualizar estado en BD
  try {
    await whatsapp.update({
      status: "DISCONNECTED",
      session: "",
      qrcode: ""
    });
    logger.info("[WhatsAppSession] Estado actualizado en BD");
  } catch (updateError) {
    logger.error(`[WhatsAppSession] Error actualizando BD: ${updateError}`);
  }

  logger.info("[WhatsAppSession] Desconexión completada");
  return res.status(200).json({ message: "Session disconnected." });
};

/**
 * Sincroniza mensajes por demanda
 * Query params:
 *   - mode: "unread" (default) | "all" - modo de sincronización
 *   - maxChats: número máximo de chats a procesar (default: 100)
 *   - maxMessages: número máximo de mensajes por chat (default: 50)
 *   - maxHours: antigüedad máxima en horas (default: 24)
 */
const sync = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const {
    mode = "unread",
    maxChats,
    maxMessages,
    maxHours
  } = req.query as {
    mode?: "unread" | "all";
    maxChats?: string;
    maxMessages?: string;
    maxHours?: string;
  };

  logger.info(
    `[WhatsAppSession] Sincronización para ${whatsappId} (modo: ${mode})`
  );

  try {
    const whatsapp = await ShowWhatsAppService(whatsappId);

    if (whatsapp.status !== "CONNECTED") {
      return res.status(400).json({
        error: "WhatsApp no está conectado",
        status: whatsapp.status
      });
    }

    const wbot = getWbot(whatsapp.id);

    if (!wbot) {
      return res.status(400).json({
        error: "No se encontró la sesión de WhatsApp"
      });
    }

    // Obtener configuración de la instancia
    const instanceConfig = await getSyncConfigForWhatsApp(whatsapp.id);

    // Configuración personalizada desde query params (sobreescribe config de instancia)
    const customConfig: {
      mode: "unread" | "all";
      maxChatsToProcess?: number;
      maxMessagesPerChat?: number;
      maxMessageAgeHours?: number;
      markAsSeen?: boolean;
      createClosedForRead?: boolean;
    } = {
      mode: mode === "all" ? "all" : "unread",
      maxChatsToProcess: instanceConfig.maxChatsToProcess,
      maxMessagesPerChat: instanceConfig.maxMessagesPerChat,
      maxMessageAgeHours: instanceConfig.maxMessageAgeHours,
      markAsSeen: instanceConfig.markAsSeen,
      createClosedForRead: instanceConfig.createClosedForRead
    };

    // Query params sobreescriben config de instancia si se proporcionan
    if (maxChats) {
      customConfig.maxChatsToProcess = parseInt(maxChats, 10);
    }
    if (maxMessages) {
      customConfig.maxMessagesPerChat = parseInt(maxMessages, 10);
    }
    if (maxHours) {
      customConfig.maxMessageAgeHours = parseInt(maxHours, 10);
    }

    // Ejecutar sincronización
    const result = await syncUnreadMessagesImproved(wbot, customConfig);

    logger.info(
      `[WhatsAppSession] Sincronización completada: ${JSON.stringify(result)}`
    );

    return res.status(200).json({
      message: "Sincronización completada",
      result
    });
  } catch (err) {
    logger.error(`[WhatsAppSession] Error en sincronización: ${err}`);
    return res.status(500).json({
      error: "Error al sincronizar mensajes",
      details: String(err)
    });
  }
};

export default { store, remove, update, sync };
