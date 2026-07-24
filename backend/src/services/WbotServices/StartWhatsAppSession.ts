import { initWbot } from "../../libs/wbot";
import Whatsapp from "../../models/Whatsapp";
import { wbotMessageListener } from "./wbotMessageListener";
import { getIO } from "../../libs/socket";
import wbotMonitor from "./wbotMonitor";
import { logger } from "../../utils/logger";
import { initZapo } from "../../libs/zapo";
import AppError from "../../errors/AppError";

export const StartWhatsAppSession = async (
  whatsapp: Whatsapp
): Promise<void> => {
  if (
    whatsapp.provider === "zapo" &&
    ["BANNED", "TEMP_BANNED"].includes(whatsapp.status)
  ) {
    throw new AppError("ERR_ZAPO_ACCOUNT_RESTRICTED", 409, {
      whatsappId: whatsapp.id,
      status: whatsapp.status,
      disconnectReason: whatsapp.disconnectReason,
      disconnectCode: whatsapp.disconnectCode
    });
  }

  const io = getIO();
  await whatsapp.update({ status: "OPENING" });
  io.emit("whatsappSession", {
    action: "update",
    session: whatsapp
  });

  try {
    if (whatsapp.provider === "zapo") {
      await initZapo(whatsapp);
      return;
    }

    const wbot = await initWbot(whatsapp);
    wbotMessageListener(wbot);
    wbotMonitor(wbot, whatsapp);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    logger.error(
      {
        whatsappId: whatsapp.id,
        sessionName: whatsapp.name,
        err
      },
      "Error starting WhatsApp session"
    );

    await whatsapp.update({
      status: "DISCONNECTED",
      qrcode: "",
      retries: (whatsapp.retries || 0) + 1
    });

    io.emit("whatsappSession", {
      action: "update",
      session: whatsapp,
      error: {
        message
      }
    });

    throw new Error(message);
  }
};
