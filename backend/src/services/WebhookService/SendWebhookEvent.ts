import axios from "axios";
import * as Sentry from "@sentry/node";
import { logger } from "../../utils/logger";
import Whatsapp from "../../models/Whatsapp";

// Tipos de eventos que se pueden enviar al webhook
export type WebhookEventType =
  | "message_received"
  | "message_sent"
  | "message_ack"
  | "connection_update"
  | "ticket_created"
  | "ticket_updated"
  | "ticket_closed"
  | "contact_created"
  | "contact_updated";

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  connectionId: number;
  connectionName: string;
  connectionNumber?: string;
  data: Record<string, any>;
}

interface SendWebhookParams {
  whatsappId: number;
  event: WebhookEventType;
  data: Record<string, any>;
}

// Cache para configuraciones de webhook (evita consultas repetidas a la BD)
const webhookConfigCache = new Map<
  number,
  { url: string; enabled: boolean; events: string[]; expiresAt: number }
>();
const CACHE_TTL = 60000; // 1 minuto

const getWebhookConfig = async (
  whatsappId: number
): Promise<{ url: string; enabled: boolean; events: string[] } | null> => {
  const cached = webhookConfigCache.get(whatsappId);
  if (cached && cached.expiresAt > Date.now()) {
    return { url: cached.url, enabled: cached.enabled, events: cached.events };
  }

  try {
    const whatsapp = await Whatsapp.findByPk(whatsappId, {
      attributes: [
        "id",
        "name",
        "number",
        "webhookUrl",
        "webhookEnabled",
        "webhookEvents"
      ]
    });

    if (!whatsapp || !whatsapp.webhookEnabled || !whatsapp.webhookUrl) {
      return null;
    }

    let events: string[] = [];
    if (whatsapp.webhookEvents) {
      try {
        events = JSON.parse(whatsapp.webhookEvents);
      } catch {
        // Si no es JSON válido, asumir todos los eventos
        events = [
          "message_received",
          "message_sent",
          "message_ack",
          "connection_update",
          "ticket_created",
          "ticket_updated",
          "ticket_closed",
          "contact_created",
          "contact_updated"
        ];
      }
    }

    const config = {
      url: whatsapp.webhookUrl,
      enabled: whatsapp.webhookEnabled,
      events
    };

    webhookConfigCache.set(whatsappId, {
      ...config,
      expiresAt: Date.now() + CACHE_TTL
    });

    return config;
  } catch (err) {
    logger.error(
      `Error getting webhook config for whatsapp ${whatsappId}:`,
      err
    );
    return null;
  }
};

// Función para invalidar el cache cuando se actualiza la configuración
export const invalidateWebhookCache = (whatsappId: number): void => {
  webhookConfigCache.delete(whatsappId);
};

// Función principal para enviar eventos al webhook
const SendWebhookEvent = async ({
  whatsappId,
  event,
  data
}: SendWebhookParams): Promise<boolean> => {
  try {
    const config = await getWebhookConfig(whatsappId);

    if (!config || !config.enabled) {
      return false;
    }

    // Verificar si el evento está en la lista de eventos permitidos
    if (config.events.length > 0 && !config.events.includes(event)) {
      return false;
    }

    const whatsapp = await Whatsapp.findByPk(whatsappId, {
      attributes: ["id", "name", "number"]
    });

    if (!whatsapp) {
      return false;
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      connectionId: whatsappId,
      connectionName: whatsapp.name,
      connectionNumber: whatsapp.number || undefined,
      data
    };

    // Enviar webhook de forma asíncrona sin bloquear
    axios
      .post(config.url, payload, {
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Event": event,
          "X-Connection-Id": whatsappId.toString()
        },
        timeout: 10000 // 10 segundos de timeout
      })
      .then(response => {
        logger.info(
          `Webhook sent successfully to ${config.url} for event ${event}: ${response.status}`
        );
      })
      .catch(error => {
        logger.error(
          `Failed to send webhook to ${config.url} for event ${event}:`,
          error.message
        );
        Sentry.captureException(error);
      });

    return true;
  } catch (err) {
    logger.error("Error in SendWebhookEvent:", err);
    Sentry.captureException(err);
    return false;
  }
};

// Funciones de conveniencia para cada tipo de evento

export const sendMessageReceivedWebhook = async (
  whatsappId: number,
  messageData: Record<string, any>
): Promise<void> => {
  await SendWebhookEvent({
    whatsappId,
    event: "message_received",
    data: messageData
  });
};

export const sendMessageSentWebhook = async (
  whatsappId: number,
  messageData: Record<string, any>
): Promise<void> => {
  await SendWebhookEvent({
    whatsappId,
    event: "message_sent",
    data: messageData
  });
};

export const sendMessageAckWebhook = async (
  whatsappId: number,
  messageData: Record<string, any>
): Promise<void> => {
  await SendWebhookEvent({
    whatsappId,
    event: "message_ack",
    data: messageData
  });
};

export const sendConnectionUpdateWebhook = async (
  whatsappId: number,
  connectionData: Record<string, any>
): Promise<void> => {
  await SendWebhookEvent({
    whatsappId,
    event: "connection_update",
    data: connectionData
  });
};

export const sendTicketCreatedWebhook = async (
  whatsappId: number,
  ticketData: Record<string, any>
): Promise<void> => {
  await SendWebhookEvent({
    whatsappId,
    event: "ticket_created",
    data: ticketData
  });
};

export const sendTicketUpdatedWebhook = async (
  whatsappId: number,
  ticketData: Record<string, any>
): Promise<void> => {
  await SendWebhookEvent({
    whatsappId,
    event: "ticket_updated",
    data: ticketData
  });
};

export const sendTicketClosedWebhook = async (
  whatsappId: number,
  ticketData: Record<string, any>
): Promise<void> => {
  await SendWebhookEvent({
    whatsappId,
    event: "ticket_closed",
    data: ticketData
  });
};

export const sendContactCreatedWebhook = async (
  whatsappId: number,
  contactData: Record<string, any>
): Promise<void> => {
  await SendWebhookEvent({
    whatsappId,
    event: "contact_created",
    data: contactData
  });
};

export const sendContactUpdatedWebhook = async (
  whatsappId: number,
  contactData: Record<string, any>
): Promise<void> => {
  await SendWebhookEvent({
    whatsappId,
    event: "contact_updated",
    data: contactData
  });
};

export default SendWebhookEvent;
