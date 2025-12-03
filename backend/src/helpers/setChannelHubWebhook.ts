import { IChannel } from "../controllers/ChannelHubController";
import Whatsapp from "../models/Whatsapp";
import { showHubToken } from "./showHubToken";

const { Client, MessageSubscription } = require("notificamehubsdk");
require("dotenv").config();

export const setChannelWebhook = async (
  whatsapp: IChannel | Whatsapp,
  whatsappId: string
): Promise<void> => {
  const notificameHubToken = await showHubToken();

  const client = new Client(notificameHubToken);
  const baseWebhookUrl = process.env.WEBHOOK || process.env.BACKEND_URL;
  const url = `${baseWebhookUrl}/hub-webhook/${whatsapp.qrcode}`;

  const subscription = new MessageSubscription(
    { url },
    { channel: whatsapp.qrcode }
  );

  client
    .createSubscription(subscription)
    .then((response: any) => {
      console.log("Webhook subscribed:", response);
    })
    .catch((error: any) => {
      console.log("Error:", error);
    });

  await Whatsapp.update(
    { status: "CONNECTED" },
    {
      where: { id: whatsappId }
    }
  );
};
