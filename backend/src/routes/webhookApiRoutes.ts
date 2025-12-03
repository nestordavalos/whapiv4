import express from "express";
import multer from "multer";
import uploadConfig from "../config/upload";
import isAuthApi from "../middleware/isAuthApi";

import * as WebhookApiController from "../controllers/WebhookApiController";

const upload = multer(uploadConfig);

const webhookApiRoutes = express.Router();

// ==========================================
// TICKETS
// ==========================================

// Listar tickets con filtros
webhookApiRoutes.get("/tickets", isAuthApi, WebhookApiController.listTickets);

// Obtener un ticket específico
webhookApiRoutes.get(
  "/tickets/:ticketId",
  isAuthApi,
  WebhookApiController.showTicket
);

// Crear un nuevo ticket
webhookApiRoutes.post("/tickets", isAuthApi, WebhookApiController.createTicket);

// Actualizar un ticket
webhookApiRoutes.put(
  "/tickets/:ticketId",
  isAuthApi,
  WebhookApiController.updateTicket
);

// ==========================================
// MESSAGES
// ==========================================

// Listar mensajes de un ticket
webhookApiRoutes.get(
  "/tickets/:ticketId/messages",
  isAuthApi,
  WebhookApiController.listMessages
);

// Enviar mensaje de texto a un ticket existente
webhookApiRoutes.post(
  "/tickets/:ticketId/messages",
  isAuthApi,
  WebhookApiController.sendMessage
);

// Enviar mensaje con multimedia a un ticket existente
webhookApiRoutes.post(
  "/tickets/:ticketId/messages/media",
  isAuthApi,
  upload.array("medias"),
  WebhookApiController.sendMediaMessage
);

// Enviar mensaje con multimedia desde URL a un ticket existente
webhookApiRoutes.post(
  "/tickets/:ticketId/messages/media-url",
  isAuthApi,
  WebhookApiController.sendMediaFromUrl
);

// Responder a un mensaje específico (quote/reply)
webhookApiRoutes.post(
  "/messages/:messageId/reply",
  isAuthApi,
  upload.array("medias"),
  WebhookApiController.replyToMessage
);

// ==========================================
// SEND MESSAGE (Direct to number)
// ==========================================

// Enviar mensaje directo a un número (crea ticket si no existe)
webhookApiRoutes.post(
  "/send",
  isAuthApi,
  upload.array("medias"),
  WebhookApiController.sendDirectMessage
);

// ==========================================
// CONTACTS
// ==========================================

// Validar si un número existe en WhatsApp
webhookApiRoutes.post(
  "/contacts/validate",
  isAuthApi,
  WebhookApiController.validateContact
);

// Crear o actualizar un contacto
webhookApiRoutes.post(
  "/contacts",
  isAuthApi,
  WebhookApiController.createOrUpdateContact
);

// Obtener información de un contacto por número
webhookApiRoutes.get(
  "/contacts/:number",
  isAuthApi,
  WebhookApiController.getContact
);

// ==========================================
// CONNECTIONS
// ==========================================

// Listar conexiones de WhatsApp
webhookApiRoutes.get(
  "/connections",
  isAuthApi,
  WebhookApiController.listConnections
);

// Obtener estado de una conexión
webhookApiRoutes.get(
  "/connections/:connectionId",
  isAuthApi,
  WebhookApiController.getConnectionStatus
);

export default webhookApiRoutes;
