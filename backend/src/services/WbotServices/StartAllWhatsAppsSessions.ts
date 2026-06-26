import ListWhatsAppsService from "../WhatsappService/ListWhatsAppsService";
import { logger } from "../../utils/logger";
import { StartWhatsAppSession } from "./StartWhatsAppSession";

export const StartAllWhatsAppsSessions = async (): Promise<void> => {
  const whatsapps = await ListWhatsAppsService();
  if (whatsapps.length > 0) {
    await Promise.allSettled(
      whatsapps.map(async whatsapp => {
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
