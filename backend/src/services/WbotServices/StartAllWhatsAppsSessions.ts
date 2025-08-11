import ListWhatsAppsService from "../WhatsappService/ListWhatsAppsService";
import { StartWhatsAppSession } from "./StartWhatsAppSession";
import { logger } from "../../utils/logger";

export const StartAllWhatsAppsSessions = async (): Promise<void> => {
  const whatsapps = await ListWhatsAppsService();
  if (whatsapps.length > 0) {
    await Promise.all(
      whatsapps.map(async whatsapp => {
        try {
          await StartWhatsAppSession(whatsapp);
        } catch (err) {
          logger.error(err);
        }
      })
    );
  }
};
