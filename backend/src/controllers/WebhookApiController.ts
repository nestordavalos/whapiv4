import { Request, Response } from "express";
import * as Yup from "yup";
import AppError from "../errors/AppError";
import GetDefaultWhatsApp from "../helpers/GetDefaultWhatsApp";
import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";
import Whatsapp from "../models/Whatsapp";
import Ticket from "../models/Ticket";
import Message from "../models/Message";
import Contact from "../models/Contact";
import { serializeContactAddress } from "../helpers/ContactAddress";
import CreateOrUpdateContactService from "../services/ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import ListMessagesService from "../services/MessageServices/ListMessagesService";
import CheckIsValidContact from "../services/WbotServices/CheckIsValidContact";
import CheckContactNumber from "../services/WbotServices/CheckNumber";
import GetProfilePicUrl from "../services/WbotServices/GetProfilePicUrl";
import SendWhatsAppMedia from "../services/WbotServices/SendWhatsAppMedia";
import SendWhatsAppMediaFromUrl from "../services/WbotServices/SendWhatsAppMediaFromUrl";
import SendWhatsAppMediaFromBase64 from "../services/WbotServices/SendWhatsAppMediaFromBase64";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import { getWbot } from "../libs/wbot";
import { getZapo } from "../libs/zapo";
import { getIO } from "../libs/socket";
import ListSettingsServiceOne from "../services/SettingServices/ListSettingsServiceOne";
import { logger } from "../utils/logger";

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Verifica la configuración closeTicketApi y cierra el ticket si está habilitado
 */
const handleAutoCloseTicket = async (
  ticketId: string | number
): Promise<void> => {
  try {
    const closeTicketApiSetting = await ListSettingsServiceOne({
      key: "closeTicketApi"
    });

    logger.info(
      `[API] handleAutoCloseTicket - ticketId: ${ticketId}, closeTicketApi: ${closeTicketApiSetting?.value}`
    );

    if (closeTicketApiSetting?.value === "enabled") {
      logger.info(`[API] Cerrando ticket ${ticketId} automáticamente`);
      await UpdateTicketService({
        ticketId: String(ticketId),
        ticketData: { status: "closed" }
      });
      logger.info(`[API] Ticket ${ticketId} cerrado exitosamente`);
    } else {
      logger.info(
        `[API] No se cierra ticket ${ticketId} - closeTicketApi no está habilitado`
      );
    }
  } catch (err) {
    logger.error(
      `[API] Error al intentar cerrar ticket automáticamente: ${err}`
    );
  }
};

// ==========================================
// TICKETS API
// ==========================================

/**
 * Listar tickets con filtros opcionales
 * GET /api/v1/tickets
 */
export const listTickets = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { status, whatsappId, queueId, page = "1", limit = "20" } = req.query;

  const whereClause: any = {};

  if (status) {
    whereClause.status = status;
  }

  if (whatsappId) {
    whereClause.whatsappId = Number(whatsappId);
  }

  if (queueId) {
    whereClause.queueId = Number(queueId);
  }

  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);
  const offset = (pageNumber - 1) * limitNumber;

  const { count, rows: tickets } = await Ticket.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number", "profilePicUrl"]
      },
      { model: Whatsapp, as: "whatsapp", attributes: ["id", "name", "number"] }
    ],
    limit: limitNumber,
    offset,
    order: [["updatedAt", "DESC"]]
  });

  return res.status(200).json({
    tickets,
    count,
    hasMore: count > offset + tickets.length,
    page: pageNumber,
    limit: limitNumber
  });
};

/**
 * Obtener un ticket específico
 * GET /api/v1/tickets/:ticketId
 */
export const showTicket = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;

  const ticket = await ShowTicketService(ticketId);

  if (!ticket) {
    throw new AppError("ERR_TICKET_NOT_FOUND", 404);
  }

  return res.status(200).json(ticket);
};

/**
 * Actualizar un ticket
 * PUT /api/v1/tickets/:ticketId
 */
export const updateTicket = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const { status, userId, queueId } = req.body;

  const ticketData: any = {};

  if (status !== undefined) {
    const validStatuses = ["open", "pending", "closed"];
    if (!validStatuses.includes(status)) {
      throw new AppError(
        "Invalid status. Valid values: open, pending, closed",
        400
      );
    }
    ticketData.status = status;
  }

  if (userId !== undefined) {
    ticketData.userId = userId;
  }

  if (queueId !== undefined) {
    ticketData.queueId = queueId;
  }

  const { ticket } = await UpdateTicketService({
    ticketId,
    ticketData
  });

  return res.status(200).json({
    message: "Ticket updated successfully",
    ticket
  });
};

/**
 * Crear un nuevo ticket
 * POST /api/v1/tickets
 */
export const createTicket = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { number, whatsappId, queueId, userId, tagsId } = req.body;

  const schema = Yup.object().shape({
    number: Yup.string()
      .nullable()
      .required("Number is required")
      .matches(/^\d+$/, "Invalid number format. Only numbers allowed.")
  });

  try {
    await schema.validate({ number });
  } catch (err: any) {
    throw new AppError(err.message, 400);
  }

  // Obtener conexión de WhatsApp primero para usarla en las validaciones
  let whatsapp: Whatsapp | null;
  if (whatsappId) {
    whatsapp = await Whatsapp.findByPk(whatsappId);
    if (!whatsapp) {
      throw new AppError(`WhatsApp connection #${whatsappId} not found`, 404);
    }
  } else {
    whatsapp = await GetDefaultWhatsApp();
  }

  // Validar número en WhatsApp usando la conexión específica
  await CheckIsValidContact(number, whatsapp.id);
  const validNumber = await CheckContactNumber(number, whatsapp.id);
  const profilePicUrl = await GetProfilePicUrl(validNumber, whatsapp.id);

  // Crear o actualizar contacto
  const contactData = {
    name: `${validNumber}`,
    number: validNumber,
    profilePicUrl,
    isGroup: false,
    whatsappId: whatsapp.id
  };

  const contact = await CreateOrUpdateContactService(contactData);

  // Crear ticket
  const ticket = await FindOrCreateTicketService(
    contact,
    whatsapp.id,
    1,
    queueId || null,
    tagsId || null,
    userId || null,
    undefined,
    { reuseLatestTicket: true }
  );

  const fullTicket = await ShowTicketService(ticket.id);
  SetTicketMessagesAsRead(fullTicket);

  return res.status(201).json({
    message: "Ticket created successfully",
    ticket: fullTicket
  });
};

// ==========================================
// MESSAGES API
// ==========================================

/**
 * Listar mensajes de un ticket
 * GET /api/v1/tickets/:ticketId/messages
 */
export const listMessages = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const { page = "1" } = req.query;

  const { messages, ticket, count, hasMore } = await ListMessagesService({
    ticketId,
    pageNumber: page as string
  });

  return res.status(200).json({
    messages,
    ticketId: ticket.id,
    count,
    hasMore,
    page: parseInt(page as string, 10)
  });
};

/**
 * Enviar mensaje de texto
 * POST /api/v1/tickets/:ticketId/messages
 */
export const sendMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const { body, quotedMsgId, queueId } = req.body;

  if (!body || body.trim() === "") {
    throw new AppError("Message body is required", 400);
  }

  const ticket = await ShowTicketService(ticketId);

  if (!ticket) {
    throw new AppError("ERR_TICKET_NOT_FOUND", 404);
  }

  logger.info(
    `[API] Enviando mensaje - ticketId: ${ticketId}, status: ${ticket.status}, queueId: ${queueId}`
  );

  // Actualizar ticket solo si NO está cerrado
  if (ticket.status !== "closed") {
    const updateData: any = {};

    if (ticket.status === "pending") {
      updateData.status = "open";
      logger.info(`[API] Cambiando ticket ${ticketId} de pending a open`);
    }

    if (queueId !== undefined && queueId !== null) {
      updateData.queueId = queueId;
      logger.info(`[API] Asignando queueId ${queueId} al ticket ${ticketId}`);
    }

    if (Object.keys(updateData).length > 0) {
      logger.info(`[API] Actualizando ticket ${ticketId}:`, updateData);
      await UpdateTicketService({
        ticketId: ticket.id,
        ticketData: updateData
      });
      await ticket.reload();
      logger.info(
        `[API] Ticket ${ticketId} actualizado. Nuevo status: ${ticket.status}`
      );
    }
  } else {
    logger.info(`[API] Ticket ${ticketId} está cerrado - no se actualiza`);
  }

  let quotedMsg: Message | null = null;
  if (quotedMsgId) {
    quotedMsg = await Message.findByPk(quotedMsgId);
    if (!quotedMsg) {
      throw new AppError("Quoted message not found", 404);
    }
  }

  const sentMessage = await SendWhatsAppMessage({
    body,
    ticket,
    quotedMsg: quotedMsg || undefined,
    source: "api"
  });

  // Obtener el mensaje creado en la BD
  const message = await Message.findByPk(sentMessage.id.id);

  // Verificar configuración de cierre automático (solo si no está ya cerrado)
  if (ticket.status !== "closed") {
    await handleAutoCloseTicket(ticket.id);
  }

  return res.status(201).json({
    message: "Message sent successfully",
    data: {
      messageId: sentMessage.id.id,
      body,
      ticketId: ticket.id,
      timestamp: sentMessage.timestamp,
      fromMe: true,
      mediaUrl: message?.mediaUrl || null
    }
  });
};

/**
 * Enviar mensaje con multimedia
 * POST /api/v1/tickets/:ticketId/messages/media
 */
export const sendMediaMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const { body, quotedMsgId, queueId } = req.body;
  const medias = req.files as Express.Multer.File[] | undefined;

  if (!medias || medias.length === 0) {
    throw new AppError("At least one media file is required", 400);
  }

  const ticket = await ShowTicketService(ticketId);

  if (!ticket) {
    throw new AppError("ERR_TICKET_NOT_FOUND", 404);
  }

  logger.info(
    `[API] Enviando mensaje - ticketId: ${ticketId}, status: ${ticket.status}, queueId: ${queueId}`
  );

  // Actualizar ticket solo si NO está cerrado
  if (ticket.status !== "closed") {
    const updateData: any = {};

    if (ticket.status === "pending") {
      updateData.status = "open";
      logger.info(`[API] Cambiando ticket ${ticketId} de pending a open`);
    }

    if (queueId !== undefined && queueId !== null) {
      updateData.queueId = queueId;
      logger.info(`[API] Asignando queueId ${queueId} al ticket ${ticketId}`);
    }

    if (Object.keys(updateData).length > 0) {
      logger.info(`[API] Actualizando ticket ${ticketId}:`, updateData);
      await UpdateTicketService({
        ticketId: ticket.id,
        ticketData: updateData
      });
      await ticket.reload();
      logger.info(
        `[API] Ticket ${ticketId} actualizado. Nuevo status: ${ticket.status}`
      );
    }
  } else {
    logger.info(`[API] Ticket ${ticketId} está cerrado - no se actualiza`);
  }

  let quotedMsg: Message | null = null;
  if (quotedMsgId) {
    quotedMsg = await Message.findByPk(quotedMsgId);
    if (!quotedMsg) {
      throw new AppError("Quoted message not found", 404);
    }
  }

  const sentMessages: any[] = [];

  for (const media of medias) {
    const sentMessage = await SendWhatsAppMedia({
      media,
      ticket,
      body: medias.indexOf(media) === 0 ? body : undefined,
      quotedMsg: quotedMsg || undefined,
      source: "api"
    });

    // Obtener el mensaje creado en la BD
    const message = await Message.findByPk(sentMessage.id.id);

    sentMessages.push({
      messageId: sentMessage.id.id,
      body: medias.indexOf(media) === 0 ? body : undefined,
      ticketId: ticket.id,
      timestamp: sentMessage.timestamp,
      fromMe: true,
      hasMedia: true,
      mediaUrl: message?.mediaUrl || null,
      mediaType: message?.mediaType || null,
      filename: media.originalname
    });
  }

  // Verificar configuración de cierre automático (solo si no está ya cerrado)
  if (ticket.status !== "closed") {
    await handleAutoCloseTicket(ticket.id);
  }

  return res.status(201).json({
    message: "Media message(s) sent successfully",
    data: sentMessages
  });
};

/**
 * Enviar mensaje con multimedia desde URL
 * POST /api/v1/tickets/:ticketId/messages/media-url
 */
export const sendMediaFromUrl = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const { body, quotedMsgId, mediaUrl, filename, queueId } = req.body;

  if (!mediaUrl) {
    throw new AppError("Media URL is required", 400);
  }

  // Validar que sea una URL válida
  const urlSchema = Yup.object().shape({
    mediaUrl: Yup.string()
      .url("Invalid URL format")
      .required("Media URL is required")
  });

  try {
    await urlSchema.validate({ mediaUrl });
  } catch (err: any) {
    throw new AppError(err.message, 400);
  }

  const ticket = await ShowTicketService(ticketId);

  if (!ticket) {
    throw new AppError("ERR_TICKET_NOT_FOUND", 404);
  }

  logger.info(
    `[API] Enviando mensaje - ticketId: ${ticketId}, status: ${ticket.status}, queueId: ${queueId}`
  );

  // Actualizar ticket solo si NO está cerrado
  if (ticket.status !== "closed") {
    const updateData: any = {};

    if (ticket.status === "pending") {
      updateData.status = "open";
      logger.info(`[API] Cambiando ticket ${ticketId} de pending a open`);
    }

    if (queueId !== undefined && queueId !== null) {
      updateData.queueId = queueId;
      logger.info(`[API] Asignando queueId ${queueId} al ticket ${ticketId}`);
    }

    if (Object.keys(updateData).length > 0) {
      logger.info(`[API] Actualizando ticket ${ticketId}:`, updateData);
      await UpdateTicketService({
        ticketId: ticket.id,
        ticketData: updateData
      });
      await ticket.reload();
      logger.info(
        `[API] Ticket ${ticketId} actualizado. Nuevo status: ${ticket.status}`
      );
    }
  } else {
    logger.info(`[API] Ticket ${ticketId} está cerrado - no se actualiza`);
  }

  let quotedMsg: Message | null = null;
  if (quotedMsgId) {
    quotedMsg = await Message.findByPk(quotedMsgId);
    if (!quotedMsg) {
      throw new AppError("Quoted message not found", 404);
    }
  }

  const sentMessage = await SendWhatsAppMediaFromUrl({
    mediaUrl,
    ticket,
    body,
    quotedMsg: quotedMsg || undefined,
    filename,
    source: "api"
  });

  // Obtener el mensaje creado en la BD
  const message = await Message.findByPk(sentMessage.id.id);

  // Verificar configuración de cierre automático (solo si no está ya cerrado)
  if (ticket.status !== "closed") {
    await handleAutoCloseTicket(ticket.id);
  }

  return res.status(201).json({
    message: "Media message sent successfully",
    data: {
      messageId: sentMessage.id.id,
      body,
      ticketId: ticket.id,
      timestamp: sentMessage.timestamp,
      fromMe: true,
      hasMedia: true,
      mediaUrl: message?.mediaUrl || null,
      mediaType: message?.mediaType || null,
      sourceUrl: mediaUrl,
      filename: filename || null
    }
  });
};

/**
 * Enviar mensaje con multimedia desde base64
 * POST /api/v1/tickets/:ticketId/messages/media-base64
 */
export const sendMediaFromBase64 = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const { body, quotedMsgId, base64Data, mimeType, filename, queueId } =
    req.body;

  if (!base64Data) {
    throw new AppError("Base64 data is required", 400);
  }

  if (!mimeType) {
    throw new AppError("MIME type is required", 400);
  }

  const ticket = await ShowTicketService(ticketId);

  if (!ticket) {
    throw new AppError("ERR_TICKET_NOT_FOUND", 404);
  }

  logger.info(
    `[API] Enviando mensaje - ticketId: ${ticketId}, status: ${ticket.status}, queueId: ${queueId}`
  );

  // Actualizar ticket solo si NO está cerrado
  if (ticket.status !== "closed") {
    const updateData: any = {};

    if (ticket.status === "pending") {
      updateData.status = "open";
      logger.info(`[API] Cambiando ticket ${ticketId} de pending a open`);
    }

    if (queueId !== undefined && queueId !== null) {
      updateData.queueId = queueId;
      logger.info(`[API] Asignando queueId ${queueId} al ticket ${ticketId}`);
    }

    if (Object.keys(updateData).length > 0) {
      logger.info(`[API] Actualizando ticket ${ticketId}:`, updateData);
      await UpdateTicketService({
        ticketId: ticket.id,
        ticketData: updateData
      });
      await ticket.reload();
      logger.info(
        `[API] Ticket ${ticketId} actualizado. Nuevo status: ${ticket.status}`
      );
    }
  } else {
    logger.info(`[API] Ticket ${ticketId} está cerrado - no se actualiza`);
  }

  let quotedMsg: Message | null = null;
  if (quotedMsgId) {
    quotedMsg = await Message.findByPk(quotedMsgId);
    if (!quotedMsg) {
      throw new AppError("Quoted message not found", 404);
    }
  }

  const sentMessage = await SendWhatsAppMediaFromBase64({
    base64Data,
    mimeType,
    ticket,
    body,
    quotedMsg: quotedMsg || undefined,
    filename,
    source: "api"
  });

  // Obtener el mensaje creado en la BD
  const message = await Message.findByPk(sentMessage.id.id);

  // Verificar configuración de cierre automático (solo si no está ya cerrado)
  if (ticket.status !== "closed") {
    await handleAutoCloseTicket(ticket.id);
  }

  return res.status(201).json({
    message: "Media message sent successfully from base64",
    data: {
      messageId: sentMessage.id.id,
      body,
      ticketId: ticket.id,
      timestamp: sentMessage.timestamp,
      fromMe: true,
      hasMedia: true,
      mediaUrl: message?.mediaUrl || null,
      mediaType: message?.mediaType || null,
      filename: filename || null
    }
  });
};

// ==========================================
// CONTACTS API
// ==========================================

/**
 * Obtener información de un contacto por número
 * GET /api/v1/contacts/:number
 */
export const getContact = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { number } = req.params;

  const contact = await Contact.findOne({
    where: { number }
  });

  if (!contact) {
    throw new AppError("Contact not found", 404);
  }

  return res.status(200).json(serializeContactAddress(contact));
};

/**
 * Validar si un número existe en WhatsApp
 * POST /api/v1/contacts/validate
 */
export const validateContact = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { number, whatsappId } = req.body;

  const schema = Yup.object().shape({
    number: Yup.string()
      .nullable()
      .required("Number is required")
      .matches(/^\d+$/, "Invalid number format. Only numbers allowed.")
  });

  try {
    await schema.validate({ number });
  } catch (err: any) {
    throw new AppError(err.message, 400);
  }

  try {
    await CheckIsValidContact(number, whatsappId);
    const validNumber = await CheckContactNumber(number, whatsappId);
    const profilePicUrl = await GetProfilePicUrl(validNumber, whatsappId);

    return res.status(200).json({
      valid: true,
      number: validNumber,
      profilePicUrl
    });
  } catch {
    return res.status(200).json({
      valid: false,
      number,
      profilePicUrl: null
    });
  }
};

/**
 * Crear o actualizar un contacto
 * POST /api/v1/contacts
 */
export const createOrUpdateContact = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { number, name, email, whatsappId } = req.body;

  const schema = Yup.object().shape({
    number: Yup.string()
      .nullable()
      .required("Number is required")
      .matches(/^\d+$/, "Invalid number format. Only numbers allowed."),
    name: Yup.string().optional()
  });

  try {
    await schema.validate({ number, name });
  } catch (err: any) {
    throw new AppError(err.message, 400);
  }

  // Validar número en WhatsApp usando la conexión específica si se proporciona
  await CheckIsValidContact(number, whatsappId);
  const validNumber = await CheckContactNumber(number, whatsappId);
  const profilePicUrl = await GetProfilePicUrl(validNumber, whatsappId);

  const contactData = {
    name: name || `${validNumber}`,
    number: validNumber,
    profilePicUrl,
    email: email || undefined,
    isGroup: false,
    whatsappId
  };

  const contact = await CreateOrUpdateContactService(contactData);

  return res.status(200).json({
    message: "Contact created/updated successfully",
    contact
  });
};

// ==========================================
// CONNECTIONS API
// ==========================================

/**
 * Listar conexiones de WhatsApp
 * GET /api/v1/connections
 */
export const listConnections = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const connections = await Whatsapp.findAll({
    attributes: [
      "id",
      "name",
      "number",
      "status",
      "isDefault",
      "createdAt",
      "updatedAt"
    ],
    order: [["name", "ASC"]]
  });

  return res.status(200).json(connections);
};

/**
 * Obtener estado de una conexión
 * GET /api/v1/connections/:connectionId
 */
export const getConnectionStatus = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { connectionId } = req.params;

  const whatsapp = await Whatsapp.findByPk(connectionId, {
    attributes: [
      "id",
      "name",
      "number",
      "status",
      "isDefault",
      "battery",
      "plugged",
      "createdAt",
      "updatedAt"
    ]
  });

  if (!whatsapp) {
    throw new AppError("Connection not found", 404);
  }

  // Consultar el proveedor activo sin intentar inicializar whatsapp-web.js
  // para una conexión Zapo.
  let isConnected = false;
  try {
    if (whatsapp.provider === "zapo") {
      isConnected = getZapo(Number(connectionId)).getState().connected;
    } else {
      const wbot = getWbot(Number(connectionId));
      if (wbot) {
        const state = await wbot.getState();
        isConnected = state === "CONNECTED";
      }
    }
  } catch {
    isConnected = false;
  }

  return res.status(200).json({
    ...whatsapp.toJSON(),
    isConnected
  });
};

// ==========================================
// SEND MESSAGE TO NUMBER (without ticket)
// ==========================================

/**
 * Enviar mensaje directo a un número (crea ticket si no existe)
 * POST /api/v1/send
 */
export const sendDirectMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {
    number,
    body,
    whatsappId,
    queueId,
    userId,
    tagsId,
    quotedMsgId,
    closeTicket = false,
    mediaUrl,
    filename,
    base64Data,
    mimeType
  } = req.body;
  const medias = req.files as Express.Multer.File[] | undefined;

  const schema = Yup.object().shape({
    number: Yup.string()
      .nullable()
      .required("Number is required")
      .matches(/^\d+$/, "Invalid number format. Only numbers allowed.")
  });

  try {
    await schema.validate({ number });
  } catch (err: any) {
    throw new AppError(err.message, 400);
  }

  // Obtener conexión primero para usarla en las validaciones
  let whatsapp: Whatsapp | null;
  if (whatsappId) {
    whatsapp = await Whatsapp.findByPk(whatsappId);
    if (!whatsapp) {
      throw new AppError(`WhatsApp connection #${whatsappId} not found`, 404);
    }
  } else {
    whatsapp = await GetDefaultWhatsApp();
  }

  // Validar número usando la conexión específica
  await CheckIsValidContact(number, whatsapp.id);
  const validNumber = await CheckContactNumber(number, whatsapp.id);
  const profilePicUrl = await GetProfilePicUrl(validNumber, whatsapp.id);

  // Crear o actualizar contacto
  const contactData = {
    name: `${validNumber}`,
    number: validNumber,
    profilePicUrl,
    isGroup: false,
    whatsappId: whatsapp.id
  };

  const contact = await CreateOrUpdateContactService(contactData);

  // Crear o encontrar ticket
  const ticket = await FindOrCreateTicketService(
    contact,
    whatsapp.id,
    1,
    queueId || null,
    tagsId || null,
    userId || null,
    undefined,
    { reuseLatestTicket: true }
  );

  const fullTicket = await ShowTicketService(ticket.id);
  SetTicketMessagesAsRead(fullTicket);

  // Si el ticket está en pending, cambiarlo a open (solo si NO está cerrado)
  if (fullTicket.status === "pending") {
    await UpdateTicketService({
      ticketId: fullTicket.id,
      ticketData: { status: "open" }
    });
  }

  // Obtener mensaje citado si existe
  let quotedMsg: Message | null = null;
  if (quotedMsgId) {
    quotedMsg = await Message.findByPk(quotedMsgId);
  }

  const sentMessages: any[] = [];

  // Enviar media desde URL si se proporciona
  if (mediaUrl) {
    const sentMessage = await SendWhatsAppMediaFromUrl({
      mediaUrl,
      ticket: fullTicket,
      body,
      quotedMsg: quotedMsg || undefined,
      filename,
      source: "api"
    });

    const message = await Message.findByPk(sentMessage.id.id);

    sentMessages.push({
      messageId: sentMessage.id.id,
      body,
      ticketId: fullTicket.id,
      timestamp: sentMessage.timestamp,
      fromMe: true,
      hasMedia: true,
      mediaUrl: message?.mediaUrl || null,
      mediaType: message?.mediaType || null,
      sourceUrl: mediaUrl,
      filename: filename || null
    });
  } else if (base64Data && mimeType) {
    // Enviar media desde base64 si se proporciona
    const sentMessage = await SendWhatsAppMediaFromBase64({
      base64Data,
      mimeType,
      ticket: fullTicket,
      body,
      quotedMsg: quotedMsg || undefined,
      filename,
      source: "api"
    });

    const message = await Message.findByPk(sentMessage.id.id);

    sentMessages.push({
      messageId: sentMessage.id.id,
      body,
      ticketId: fullTicket.id,
      timestamp: sentMessage.timestamp,
      fromMe: true,
      hasMedia: true,
      mediaUrl: message?.mediaUrl || null,
      mediaType: message?.mediaType || null,
      filename: filename || null
    });
  } else if (medias && medias.length > 0) {
    // Enviar medias si existen (archivos subidos)
    for (const media of medias) {
      const sentMessage = await SendWhatsAppMedia({
        media,
        ticket: fullTicket,
        body: medias.indexOf(media) === 0 ? body : undefined,
        quotedMsg: quotedMsg || undefined,
        source: "api"
      });

      const message = await Message.findByPk(sentMessage.id.id);

      sentMessages.push({
        messageId: sentMessage.id.id,
        body: medias.indexOf(media) === 0 ? body : undefined,
        ticketId: fullTicket.id,
        timestamp: sentMessage.timestamp,
        fromMe: true,
        hasMedia: true,
        mediaUrl: message?.mediaUrl || null,
        mediaType: message?.mediaType || null,
        filename: media.originalname
      });
    }
  } else if (body && body.trim() !== "") {
    // Enviar mensaje de texto
    const sentMessage = await SendWhatsAppMessage({
      body,
      ticket: fullTicket,
      quotedMsg: quotedMsg || undefined,
      source: "api"
    });

    const message = await Message.findByPk(sentMessage.id.id);

    sentMessages.push({
      messageId: sentMessage.id.id,
      body,
      ticketId: fullTicket.id,
      timestamp: sentMessage.timestamp,
      fromMe: true,
      hasMedia: false,
      mediaUrl: message?.mediaUrl || null
    });
  } else {
    throw new AppError("Message body or media is required", 400);
  }

  // Emitir evento de ticket actualizado al frontend para asegurar visibilidad
  try {
    const updatedTicket = await ShowTicketService(fullTicket.id);
    const io = getIO();
    io.to(updatedTicket.status)
      .to("notification")
      .to(fullTicket.id.toString())
      .emit("ticket", {
        action: "update",
        ticket: updatedTicket
      });
  } catch (socketErr) {
    logger.warn(
      `[sendDirectMessage] Failed to emit ticket update: ${socketErr}`
    );
  }

  // Cerrar ticket si se solicita explícitamente o si la configuración lo indica (solo si NO está ya cerrado)
  if (fullTicket.status !== "closed") {
    if (closeTicket) {
      await UpdateTicketService({
        ticketId: fullTicket.id,
        ticketData: { status: "closed" }
      });
    } else {
      // Si no se especificó closeTicket, verificar la configuración global
      await handleAutoCloseTicket(fullTicket.id);
    }
  }

  return res.status(201).json({
    message: "Message(s) sent successfully",
    ticketId: fullTicket.id,
    contactId: contact.id,
    contact: serializeContactAddress(contact),
    data: sentMessages
  });
};

// ==========================================
// REPLY TO MESSAGE
// ==========================================

/**
 * Responder a un mensaje específico
 * POST /api/v1/messages/:messageId/reply
 */
export const replyToMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId } = req.params;
  const { body, mediaUrl, filename, base64Data, mimeType } = req.body;
  const medias = req.files as Express.Multer.File[] | undefined;

  // Encontrar el mensaje original
  const originalMessage = await Message.findByPk(messageId, {
    include: [{ model: Ticket, as: "ticket" }]
  });

  if (!originalMessage) {
    throw new AppError("Message not found", 404);
  }

  const ticket = await ShowTicketService(originalMessage.ticketId);

  if (!ticket) {
    throw new AppError("Ticket not found", 404);
  }

  const sentMessages: any[] = [];

  // Enviar media desde URL si se proporciona
  if (mediaUrl) {
    const sentMessage = await SendWhatsAppMediaFromUrl({
      mediaUrl,
      ticket,
      body,
      quotedMsg: originalMessage,
      filename,
      source: "api"
    });

    const message = await Message.findByPk(sentMessage.id.id);

    sentMessages.push({
      messageId: sentMessage.id.id,
      body,
      ticketId: ticket.id,
      timestamp: sentMessage.timestamp,
      fromMe: true,
      hasMedia: true,
      mediaUrl: message?.mediaUrl || null,
      mediaType: message?.mediaType || null,
      sourceUrl: mediaUrl,
      filename: filename || null,
      quotedMsgId: messageId
    });
  } else if (base64Data && mimeType) {
    // Enviar media desde base64 si se proporciona
    const sentMessage = await SendWhatsAppMediaFromBase64({
      base64Data,
      mimeType,
      ticket,
      body,
      quotedMsg: originalMessage,
      filename,
      source: "api"
    });

    const message = await Message.findByPk(sentMessage.id.id);

    sentMessages.push({
      messageId: sentMessage.id.id,
      body,
      ticketId: ticket.id,
      timestamp: sentMessage.timestamp,
      fromMe: true,
      hasMedia: true,
      mediaUrl: message?.mediaUrl || null,
      mediaType: message?.mediaType || null,
      filename: filename || null,
      quotedMsgId: messageId
    });
  } else if (medias && medias.length > 0) {
    // Enviar medias si existen (archivos subidos)
    for (const media of medias) {
      const sentMessage = await SendWhatsAppMedia({
        media,
        ticket,
        body: medias.indexOf(media) === 0 ? body : undefined,
        quotedMsg: originalMessage,
        source: "api"
      });

      const message = await Message.findByPk(sentMessage.id.id);

      sentMessages.push({
        messageId: sentMessage.id.id,
        body: medias.indexOf(media) === 0 ? body : undefined,
        ticketId: ticket.id,
        timestamp: sentMessage.timestamp,
        fromMe: true,
        hasMedia: true,
        mediaUrl: message?.mediaUrl || null,
        mediaType: message?.mediaType || null,
        filename: media.originalname,
        quotedMsgId: messageId
      });
    }
  } else if (body && body.trim() !== "") {
    // Enviar mensaje de texto
    const sentMessage = await SendWhatsAppMessage({
      body,
      ticket,
      quotedMsg: originalMessage,
      source: "api"
    });

    const message = await Message.findByPk(sentMessage.id.id);

    sentMessages.push({
      messageId: sentMessage.id.id,
      body,
      ticketId: ticket.id,
      timestamp: sentMessage.timestamp,
      fromMe: true,
      hasMedia: false,
      mediaUrl: message?.mediaUrl || null,
      quotedMsgId: messageId
    });
  } else {
    throw new AppError("Message body or media is required", 400);
  }

  return res.status(201).json({
    message: "Reply sent successfully",
    ticketId: ticket.id,
    data: sentMessages
  });
};
