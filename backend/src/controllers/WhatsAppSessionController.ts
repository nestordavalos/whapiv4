import { Request, Response } from "express";
import path from "path";
import fs from "fs/promises";
import { getWbot, removeWbot } from "../libs/wbot";
import {
  removeZapo,
  requestZapoHistorySync,
  resetZapoForReuse
} from "../libs/zapo";
import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";
import {
  syncUnreadMessagesImproved,
  getSyncConfigForWhatsApp
} from "../services/WbotServices/MessageSyncService";
import { logger } from "../utils/logger";
import Whatsapp from "../models/Whatsapp";

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const getSessionPath = (whatsappId: number): string =>
  path.resolve(__dirname, `../../.wwebjs_auth/session-bd_${whatsappId}`);

const wait = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const cleanupSessionResources = async (
  whatsapp: Whatsapp,
  options: { deleteAuthFiles?: boolean } = {}
): Promise<void> => {
  const { deleteAuthFiles = false } = options;

  if (whatsapp.provider === "zapo") {
    await removeZapo(whatsapp.id, deleteAuthFiles);
    return;
  }

  try {
    const wbot = getWbot(whatsapp.id);

    if (wbot.pingInterval) {
      clearInterval(wbot.pingInterval);
      wbot.pingInterval = undefined;
    }
    if (wbot.lidFixInterval) {
      clearInterval(wbot.lidFixInterval);
      wbot.lidFixInterval = undefined;
    }

    try {
      await Promise.race([
        wbot.destroy(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Destroy timeout")), 10000)
        )
      ]);
    } catch (destroyError) {
      logger.warn(
        { whatsappId: whatsapp.id, err: destroyError },
        "[WhatsAppSession] Error/timeout destruyendo cliente"
      );
    }
  } catch (error) {
    logger.debug(
      { whatsappId: whatsapp.id, err: error },
      "[WhatsAppSession] No había cliente activo para limpiar"
    );
  }

  try {
    removeWbot(whatsapp.id);
  } catch (removeError) {
    logger.warn(
      { whatsappId: whatsapp.id, err: removeError },
      "[WhatsAppSession] Error removiendo sesión del array"
    );
  }

  if (!deleteAuthFiles) {
    return;
  }

  await wait(3000);
  const sessionPath = getSessionPath(whatsapp.id);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await fs.rm(sessionPath, { recursive: true, force: true });
      logger.info(
        { whatsappId: whatsapp.id, sessionPath },
        "[WhatsAppSession] Archivos de sesión eliminados"
      );
      return;
    } catch (rmError) {
      logger.warn(
        { whatsappId: whatsapp.id, attempt, sessionPath, err: rmError },
        "[WhatsAppSession] Falló eliminar archivos de sesión"
      );
      if (attempt < 3) {
        await wait(2000 * attempt);
      }
    }
  }

  logger.error(
    { whatsappId: whatsapp.id, sessionPath },
    "[WhatsAppSession] No se pudieron eliminar archivos de sesión"
  );
};

const store = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsapp = await ShowWhatsAppService(whatsappId);

  await cleanupSessionResources(whatsapp);

  try {
    await StartWhatsAppSession(whatsapp);
  } catch (err) {
    logger.warn(
      { whatsappId: whatsapp.id, error: getErrorMessage(err) },
      "[WhatsAppSession] No se pudo iniciar sesión"
    );
    return res.status(500).json({
      message: "No se pudo iniciar la sesión de WhatsApp.",
      error: getErrorMessage(err)
    });
  }

  return res.status(200).json({ message: "Starting session." });
};

const update = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const currentWhatsapp = await ShowWhatsAppService(whatsappId);

  await cleanupSessionResources(currentWhatsapp, { deleteAuthFiles: true });

  const { whatsapp } = await UpdateWhatsAppService({
    whatsappId,
    whatsappData: { session: "" }
  });
  await whatsapp.update({ qrcode: "" });

  try {
    await StartWhatsAppSession(whatsapp);
  } catch (err) {
    logger.warn(
      { whatsappId: whatsapp.id, error: getErrorMessage(err) },
      "[WhatsAppSession] No se pudo iniciar sesión con nuevo QR"
    );
    return res.status(500).json({
      message: "No se pudo generar un nuevo código QR.",
      error: getErrorMessage(err)
    });
  }

  return res.status(200).json({ message: "Starting session." });
};

const reuse = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsapp = await ShowWhatsAppService(whatsappId);

  if (whatsapp.provider !== "zapo") {
    throw new AppError("ERR_ZAPO_REUSE_ONLY", 400);
  }

  const clearedDomains = await resetZapoForReuse(whatsapp.id);
  await whatsapp.update({
    status: "DISCONNECTED",
    session: "",
    qrcode: "",
    number: "",
    retries: 0,
    disconnectReason: null,
    disconnectCode: null,
    disconnectedAt: null
  });

  await StartWhatsAppSession(whatsapp);

  logger.info(
    { whatsappId: whatsapp.id, clearedDomains, userId: req.user?.id },
    "[WhatsAppSession] Zapo connection recreated for reuse"
  );

  return res.status(200).json({
    message: "Zapo connection recreated. Scan the new QR code.",
    whatsappId: whatsapp.id,
    clearedDomains
  });
};

const remove = async (req: Request, res: Response): Promise<Response> => {
  logger.info("[WhatsAppSession] Recibiendo solicitud de desconexión...");
  const { whatsappId } = req.params;
  const whatsapp = await ShowWhatsAppService(whatsappId);

  await cleanupSessionResources(whatsapp, { deleteAuthFiles: true });

  // Actualizar estado en BD
  try {
    await whatsapp.update({
      status: "DISCONNECTED",
      session: "",
      qrcode: ""
    });
    logger.info("[WhatsAppSession] Estado actualizado en BD");
    // Emitir evento por WebSocket para actualizar el frontend
    const io = getIO();
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

    // Obtener configuración de la instancia
    const instanceConfig = await getSyncConfigForWhatsApp(whatsapp.id);

    // Configuración personalizada desde query params (sobreescribe config de instancia)
    const customConfig: {
      mode: "unread" | "all";
      maxChatsToProcess?: number;
      maxMessagesPerChat?: number;
      maxMessageAgeHours?: number;
      delayBetweenChats?: number;
      markAsSeen?: boolean;
      createClosedForRead?: boolean;
    } = {
      mode: mode === "all" ? "all" : "unread",
      maxChatsToProcess: instanceConfig.maxChatsToProcess,
      maxMessagesPerChat: instanceConfig.maxMessagesPerChat,
      maxMessageAgeHours: instanceConfig.maxMessageAgeHours,
      delayBetweenChats: instanceConfig.delayBetweenChats,
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

    if (whatsapp.provider === "zapo") {
      const result = await requestZapoHistorySync(whatsapp.id, {
        mode: customConfig.mode,
        maxChats: customConfig.maxChatsToProcess || 100,
        maxMessages: customConfig.maxMessagesPerChat || 50,
        delayBetweenChats: customConfig.delayBetweenChats || 0,
        maxMessageAgeHours: customConfig.maxMessageAgeHours || 24,
        markAsSeen: customConfig.markAsSeen,
        createClosedForRead: customConfig.createClosedForRead
      });
      logger.info(
        { whatsappId: whatsapp.id, result },
        "[WhatsAppSession] Zapo history sync requested"
      );
      return res.status(200).json({
        message: "Sincronización Zapo solicitada",
        result
      });
    }

    const wbot = getWbot(whatsapp.id);

    if (!wbot) {
      return res.status(400).json({
        error: "No se encontró la sesión de WhatsApp"
      });
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

export default { store, remove, update, reuse, sync };
