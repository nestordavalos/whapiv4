import { Request, Response } from "express";
import path from "path";
import fs from "fs/promises";
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

    if (wbot) {
      logger.info("[WhatsAppSession] Preparando para cerrar sesión...");

      // Limpiar intervalos antes de destroy
      if (wbot.pingInterval) {
        clearInterval(wbot.pingInterval);
        wbot.pingInterval = undefined;
        logger.info("[WhatsAppSession] Intervalos limpiados");
      }

      // El authStrategy.logout ya fue desactivado en initWbot (evento ready)
      // Esto previene el error EBUSY en Windows cuando se llama a destroy

      // Destruir el cliente (no intentará eliminar archivos bloqueados)
      try {
        logger.info("[WhatsAppSession] Destruyendo cliente...");
        await Promise.race([
          wbot.destroy(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Destroy timeout")), 10000)
          )
        ]);
        logger.info("[WhatsAppSession] Cliente destruido exitosamente");
      } catch (destroyError) {
        logger.warn(
          `[WhatsAppSession] Error/timeout en destroy: ${destroyError}`
        );
      }

      // Esperar para que Chrome/Puppeteer libere completamente los archivos (crítico en Windows)
      logger.info(
        "[WhatsAppSession] Esperando a que se liberen los archivos..."
      );
      await new Promise(resolve => setTimeout(resolve, 3000));
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

  // Intentar eliminar archivos de sesión con reintentos (manejo de archivos bloqueados en Windows)
  const sessionPath = path.resolve(
    __dirname,
    `../../.wwebjs_auth/session-bd_${whatsapp.id}`
  );
  logger.info(`[WhatsAppSession] Intentando eliminar archivos: ${sessionPath}`);

  let deleteSuccess = false;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await fs.rm(sessionPath, { recursive: true, force: true });
      logger.info(
        "[WhatsAppSession] Archivos de sesión eliminados exitosamente"
      );
      deleteSuccess = true;
      break;
    } catch (rmError: any) {
      logger.warn(
        `[WhatsAppSession] Intento ${attempt}/3 falló al eliminar archivos: ${rmError.message}`
      );
      if (attempt < 3) {
        // Esperar antes de reintentar (2s, luego 4s)
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  if (!deleteSuccess) {
    logger.error(
      `[WhatsAppSession] No se pudieron eliminar archivos después de 3 intentos. Path: ${sessionPath}`
    );
    logger.error(
      "[WhatsAppSession] Los archivos se eliminarán automáticamente en el próximo reinicio"
    );
  }

  // Actualizar estado en BD
  try {
    await whatsapp.update({
      status: "DISCONNECTED",
      session: "",
      qrcode: ""
    });
    logger.info("[WhatsAppSession] Estado actualizado en BD");
    // Emitir evento por WebSocket para actualizar el frontend
    const io = require("../libs/socket").getIO();
    io.emit("whatsappSession", { action: "update", session: whatsapp });
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
