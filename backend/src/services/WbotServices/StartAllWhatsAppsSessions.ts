import ListWhatsAppsService from "../WhatsappService/ListWhatsAppsService";
import { logger } from "../../utils/logger";
import { StartWhatsAppSession } from "./StartWhatsAppSession";

export const StartAllWhatsAppsSessions = async (): Promise<void> => {
  const whatsapps = await ListWhatsAppsService();
  if (whatsapps.length > 0) {
    await Promise.allSettled(
      whatsapps.map(async whatsapp => {
        if (
          whatsapp.provider === "zapo" &&
          ["BANNED", "TEMP_BANNED"].includes(whatsapp.status)
        ) {
          logger.info(
            {
              whatsappId: whatsapp.id,
              status: whatsapp.status,
              disconnectReason: whatsapp.disconnectReason,
              disconnectCode: whatsapp.disconnectCode
            },
            "Skipping automatic start for restricted Zapo account"
          );
          return;
        }

        try {
          await StartWhatsAppSession(whatsapp);
        } catch (err) {
          logger.warn(
            { whatsappId: whatsapp.id, sessionName: whatsapp.name, err },
            "WhatsApp session did not start during boot"
          );
        }
      })
    );
  }
};
