import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { removeWbot } from "../libs/wbot";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import AppError from "../errors/AppError";

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
  defineWorkHours?: boolean;
  outOfWorkMessage?: string;
  monday?: boolean;
  tuesday?: boolean;
  wednesday?: boolean;
  thursday?: boolean;
  friday?: boolean;
  saturday?: boolean;
  sunday?: boolean;
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
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const whatsapps = await ListWhatsAppsService();
  return res.status(200).json(whatsapps);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  try {
    const WhatsApps = await ListWhatsAppsService();

    if (WhatsApps.length >= Number(process.env.CONNECTIONS_LIMIT)) {
      throw new AppError("ERR_CONNECTION_CREATION_COUNT", 403);
    }

    const whatsappData: WhatsappData = req.body;

    const { whatsapp, oldDefaultWhatsapp } = await CreateWhatsAppService(whatsappData);

    try {
      await StartWhatsAppSession(whatsapp);
    } catch (sessionError: any) {
      console.error("Error iniciando sesión de WhatsApp:", sessionError);
      return res.status(sessionError.statusCode || 500).json({ error: sessionError.message });
    }

    const io = getIO();
    io.emit("whatsapp", { action: "update", whatsapp });

    if (oldDefaultWhatsapp) {
      io.emit("whatsapp", { action: "update", whatsapp: oldDefaultWhatsapp });
    }

    return res.status(200).json(whatsapp);
  } catch (error: any) {
    console.error("Error en store:", error);
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { whatsappId } = req.params;
    const whatsapp = await ShowWhatsAppService(whatsappId);
    return res.status(200).json(whatsapp);
  } catch (error: any) {
    console.error("Error en show:", error);
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { whatsappId } = req.params;
    const whatsappData = req.body;

    const { whatsapp, oldDefaultWhatsapp } = await UpdateWhatsAppService({ whatsappData, whatsappId });

    const io = getIO();
    io.emit("whatsapp", { action: "update", whatsapp });

    if (oldDefaultWhatsapp) {
      io.emit("whatsapp", { action: "update", whatsapp: oldDefaultWhatsapp });
    }

    return res.status(200).json(whatsapp);
  } catch (error: any) {
    console.error("Error en update:", error);
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { whatsappId } = req.params;

    await DeleteWhatsAppService(whatsappId);
    removeWbot(+whatsappId);

    const io = getIO();
    io.emit("whatsapp", {
      action: "delete",
      whatsappId: +whatsappId
    });

    return res.status(200).json({ message: "Whatsapp deleted." });
  } catch (error: any) {
    console.error("Error en remove:", error);
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};
