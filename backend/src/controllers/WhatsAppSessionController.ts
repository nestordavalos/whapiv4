import { Request, Response } from "express";
import { getWbot, removeWbot } from "../libs/wbot";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";
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
  console.log("Recebendo solicitud de desconexion...");
  const { whatsappId } = req.params;
  const whatsapp = await ShowWhatsAppService(whatsappId);

  try {
    console.log("Obtendo instancia do WhatsApp...");
    const wbot = getWbot(whatsapp.id);

    console.log("Executando logout...");
    if (wbot && typeof wbot.logout === "function") {
      try {
        await wbot.logout();
      } catch (error) {
        console.error("Erro ao desconectar:", error);
      }
    }
  } catch (error) {
    console.error("Instancia de WhatsApp não encontrada:", error);
  } finally {
    removeWbot(whatsapp.id);
  }

  console.log("Logout concluido. Respondendo ao cliente...");
  return res.status(200).json({ message: "Session disconnected." });
};

export default { store, remove, update };
