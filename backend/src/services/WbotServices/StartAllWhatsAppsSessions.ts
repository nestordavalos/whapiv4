import ListWhatsAppsService from "../WhatsappService/ListWhatsAppsService";
import { StartWhatsAppSession } from "./StartWhatsAppSession";
import { setChannelWebhook } from "../../helpers/setChannelHubWebhook";

export const StartAllWhatsAppsSessions = async (): Promise<void> => {
  const whatsapps = await ListWhatsAppsService();
  if (whatsapps.length > 0) {
    whatsapps.forEach(whatsapp => {
      if (whatsapp.type) {
        setChannelWebhook(whatsapp, whatsapp.id.toString());
      } else {
        StartWhatsAppSession(whatsapp);
      }
    });
  }
};
