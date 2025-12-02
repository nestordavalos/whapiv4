import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { removeWbot, restartWbot, shutdownWbot, initWbot } from "../libs/wbot";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import { logger } from "../utils/logger";
import AppError from "../errors/AppError";
import Whatsapp from "../models/Whatsapp";

import CreateWhatsAppService from "../services/WhatsappService/CreateWhatsAppService";
import DeleteWhatsAppService from "../services/WhatsappService/DeleteWhatsAppService";
import ListWhatsAppsService from "../services/WhatsappService/ListWhatsAppsService";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";

interface WhatsappData {
  name: string;
  queueIds: number[];
  greetingMessage?: string;
  farewellMessage?: string;
  ratingMessage?: string;
  status?: string;
  isDefault?: boolean;
  isGroup?: boolean;
  sendInactiveMessage?: boolean;
  inactiveMessage?: string;
  timeInactiveMessage?: string;

  // Define work hours
  defineWorkHours?: boolean;
  outOfWorkMessage?: string;
  // Days of the week
  monday?: boolean;
  tuesday?: boolean;
  wednesday?: boolean;
  thursday?: boolean;
  friday?: boolean;
  saturday?: boolean;
  sunday?: boolean;
  // Hours for each day of the week
  StartDefineWorkHoursMonday?: string;
  EndDefineWorkHoursMonday?: string;
  StartDefineWorkHoursMondayLunch?: string;
  EndDefineWorkHoursMondayLunch?: string;

  StartDefineWorkHoursTuesday?: string;
  EndDefineWorkHoursTuesday?: string;
  StartDefineWorkHoursTuesdayLunch?: string;
  EndDefineWorkHoursTuesdayLunch?: string;

  StartDefineWorkHoursWednesday?: string;
  EndDefineWorkHoursWednesday?: string;
  StartDefineWorkHoursWednesdayLunch?: string;
  EndDefineWorkHoursWednesdayLunch?: string;

  StartDefineWorkHoursThursday?: string;
  EndDefineWorkHoursThursday?: string;
  StartDefineWorkHoursThursdayLunch?: string;
  EndDefineWorkHoursThursdayLunch?: string;

  StartDefineWorkHoursFriday?: string;
  EndDefineWorkHoursFriday?: string;
  StartDefineWorkHoursFridayLunch?: string;
  EndDefineWorkHoursFridayLunch?: string;

  StartDefineWorkHoursSaturday?: string;
  EndDefineWorkHoursSaturday?: string;
  StartDefineWorkHoursSaturdayLunch?: string;
  EndDefineWorkHoursSaturdayLunch?: string;

  StartDefineWorkHoursSunday?: string;
  EndDefineWorkHoursSunday?: string;
  StartDefineWorkHoursSundayLunch?: string;
  EndDefineWorkHoursSundayLunch?: string;

  // Webhook configuration - Multiple webhooks support
  webhookUrls?: Array<{
    id: string;
    name: string;
    url: string;
    enabled: boolean;
    events: string[];
  }>;
  webhookEnabled?: boolean;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const whatsapps = await ListWhatsAppsService();

  return res.status(200).json(whatsapps);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const WhatsApps = await ListWhatsAppsService();

  if (WhatsApps.length >= Number(process.env.CONNECTIONS_LIMIT)) {
    throw new AppError("ERR_CONNECTION_CREATION_COUNT", 403);
  }

  const {
    name,
    status,
    isDefault,
    greetingMessage,
    farewellMessage,
    queueIds,
    isGroup,
    sendInactiveMessage,
    inactiveMessage,
    timeInactiveMessage,

    defineWorkHours,
    outOfWorkMessage,

    monday,
    tuesday,
    wednesday,
    thursday,
    friday,
    saturday,
    sunday,

    StartDefineWorkHoursMonday,
    EndDefineWorkHoursMonday,
    StartDefineWorkHoursMondayLunch,
    EndDefineWorkHoursMondayLunch,

    StartDefineWorkHoursTuesday,
    EndDefineWorkHoursTuesday,
    StartDefineWorkHoursTuesdayLunch,
    EndDefineWorkHoursTuesdayLunch,

    StartDefineWorkHoursWednesday,
    EndDefineWorkHoursWednesday,
    StartDefineWorkHoursWednesdayLunch,
    EndDefineWorkHoursWednesdayLunch,

    StartDefineWorkHoursThursday,
    EndDefineWorkHoursThursday,
    StartDefineWorkHoursThursdayLunch,
    EndDefineWorkHoursThursdayLunch,

    StartDefineWorkHoursFriday,
    EndDefineWorkHoursFriday,
    StartDefineWorkHoursFridayLunch,
    EndDefineWorkHoursFridayLunch,

    StartDefineWorkHoursSaturday,
    EndDefineWorkHoursSaturday,
    StartDefineWorkHoursSaturdayLunch,
    EndDefineWorkHoursSaturdayLunch,

    StartDefineWorkHoursSunday,
    EndDefineWorkHoursSunday,
    StartDefineWorkHoursSundayLunch,
    EndDefineWorkHoursSundayLunch,

    webhookUrls,
    webhookEnabled
  }: WhatsappData = req.body;

  const { whatsapp, oldDefaultWhatsapp } = await CreateWhatsAppService({
    name,
    status,
    isDefault,
    greetingMessage,
    farewellMessage,
    queueIds,
    isGroup,
    sendInactiveMessage,
    inactiveMessage,
    timeInactiveMessage,

    defineWorkHours,
    outOfWorkMessage,

    monday,
    tuesday,
    wednesday,
    thursday,
    friday,
    saturday,
    sunday,

    StartDefineWorkHoursMonday,
    EndDefineWorkHoursMonday,
    StartDefineWorkHoursMondayLunch,
    EndDefineWorkHoursMondayLunch,

    StartDefineWorkHoursTuesday,
    EndDefineWorkHoursTuesday,
    StartDefineWorkHoursTuesdayLunch,
    EndDefineWorkHoursTuesdayLunch,

    StartDefineWorkHoursWednesday,
    EndDefineWorkHoursWednesday,
    StartDefineWorkHoursWednesdayLunch,
    EndDefineWorkHoursWednesdayLunch,

    StartDefineWorkHoursThursday,
    EndDefineWorkHoursThursday,
    StartDefineWorkHoursThursdayLunch,
    EndDefineWorkHoursThursdayLunch,

    StartDefineWorkHoursFriday,
    EndDefineWorkHoursFriday,
    StartDefineWorkHoursFridayLunch,
    EndDefineWorkHoursFridayLunch,

    StartDefineWorkHoursSaturday,
    EndDefineWorkHoursSaturday,
    StartDefineWorkHoursSaturdayLunch,
    EndDefineWorkHoursSaturdayLunch,

    StartDefineWorkHoursSunday,
    EndDefineWorkHoursSunday,
    StartDefineWorkHoursSundayLunch,
    EndDefineWorkHoursSundayLunch,

    webhookUrls,
    webhookEnabled
  });

  // Start WhatsApp session asynchronously without blocking the response
  StartWhatsAppSession(whatsapp).catch(err => {
    logger.error("Error starting WhatsApp session:", err);
  });

  const io = getIO();
  io.emit("whatsapp", {
    action: "update",
    whatsapp
  });

  if (oldDefaultWhatsapp) {
    io.emit("whatsapp", {
      action: "update",
      whatsapp: oldDefaultWhatsapp
    });
  }

  return res.status(200).json(whatsapp);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;

  const whatsapp = await ShowWhatsAppService(whatsappId);

  return res.status(200).json(whatsapp);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsappData = req.body;

  const { whatsapp, oldDefaultWhatsapp } = await UpdateWhatsAppService({
    whatsappData,
    whatsappId
  });

  const io = getIO();
  io.emit("whatsapp", {
    action: "update",
    whatsapp
  });

  if (oldDefaultWhatsapp) {
    io.emit("whatsapp", {
      action: "update",
      whatsapp: oldDefaultWhatsapp
    });
  }

  return res.status(200).json(whatsapp);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;

  await DeleteWhatsAppService(whatsappId);
  removeWbot(+whatsappId);

  const io = getIO();
  io.emit("whatsapp", {
    action: "delete",
    whatsappId: +whatsappId
  });

  return res.status(200).json({ message: "Whatsapp deleted." });
};

export const restart = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;

  if (!whatsappId) {
    return res.status(400).json({ message: "WhatsApp ID is required." });
  }

  try {
    console.log(`Iniciando restart para WhatsApp ID: ${whatsappId}`);

    await restartWbot(+whatsappId);

    console.log(
      `Restart realizado com sucesso para WhatsApp ID: ${whatsappId}`
    );

    // Obtener el whatsapp actualizado para enviarlo en el socket
    const whatsapp = await ShowWhatsAppService(whatsappId);

    const io = getIO();
    io.emit("whatsapp", {
      action: "update",
      whatsapp
    });

    return res
      .status(200)
      .json({ message: "WhatsApp session restarted successfully." });
  } catch (error) {
    console.error(`Erro ao reiniciar WhatsApp ID ${whatsappId}:`, error);

    return res.status(500).json({
      message: "Failed to restart WhatsApp session.",
      error: (error as Error).message
    });
  }
};

export const shutdown = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;

  if (!whatsappId) {
    return res.status(400).json({ message: "WhatsApp ID is required." });
  }

  try {
    console.log(`Iniciando shutdown para WhatsApp ID: ${whatsappId}`);

    await shutdownWbot(whatsappId);
    console.log(
      `Shutdown realizado com sucesso para WhatsApp ID: ${whatsappId}`
    );

    // Obtener el whatsapp actualizado para enviarlo en el socket
    const whatsapp = await ShowWhatsAppService(whatsappId);

    const io = getIO();
    io.emit("whatsapp", {
      action: "update",
      whatsapp
    });
    console.log("Evento emitido com sucesso via WebSocket.");

    return res.status(200).json({
      message: "WhatsApp session shutdown successfully."
    });
  } catch (error) {
    console.error("Erro ao desligar o WhatsApp:", error);

    return res.status(500).json({
      message: "Failed to shutdown WhatsApp session.",
      error: (error as Error).message
    });
  }
};

export const start = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsapp = await Whatsapp.findByPk(whatsappId);
  if (!whatsapp) throw Error("no se encontro el whatsapp");

  try {
    await initWbot(whatsapp);

    // Obtener el whatsapp actualizado
    const updatedWhatsapp = await ShowWhatsAppService(whatsappId);

    const io = getIO();
    io.emit("whatsapp", {
      action: "update",
      whatsapp: updatedWhatsapp
    });
    return res
      .status(200)
      .json({ message: "WhatsApp session started successfully." });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to start WhatsApp session.",
      error: (error as Error).message
    });
  }
};
