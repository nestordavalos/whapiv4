import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import CreateTicketService from "../services/TicketServices/CreateTicketService";
import DeleteTicketService from "../services/TicketServices/DeleteTicketService";
import ListTicketsService from "../services/TicketServices/ListTicketsService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import ShowQueueService from "../services/QueueService/ShowQueueService";
import formatBody from "../helpers/Mustache";
import { getWbot } from "../libs/wbot";
import { logger } from "../utils/logger";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  status: string;
  date: string;
  showAll: string;
  withUnreadMessages: string;
  queueIds: string;
  tags: string;
  whatsappIds: string;
  userIds: string;
};

interface TicketData {
  contactId: number;
  status: string;
  queueId: number;
  userId: number;
  transf: boolean;
  isFinished: boolean;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const {
    pageNumber,
    status,
    date,
    searchParam,
    showAll,
    queueIds: queueIdsStringified,
    tags: tagsStringified,
    whatsappIds: whatsappIdsStringified,
    userIds: userIdsStringified,
    withUnreadMessages
  } = req.query as IndexQuery;

  const userId = req.user.id;

  let queueIds: number[] = [];
  let tags: number[] = [];
  let whatsappIds: number[] = [];
  let userIds: number[] = [];

  if (queueIdsStringified) {
    queueIds = JSON.parse(queueIdsStringified);
  }

  if (tagsStringified) {
    tags = JSON.parse(tagsStringified);
  }

  if (whatsappIdsStringified) {
    whatsappIds = JSON.parse(whatsappIdsStringified);
  }

  if (userIdsStringified) {
    userIds = JSON.parse(userIdsStringified);
  }

  const { tickets, count, hasMore } = await ListTicketsService({
    searchParam,
    pageNumber,
    status,
    date,
    showAll,
    userId,
    queueIds,
    tags,
    whatsappIds,
    userIds,
    withUnreadMessages
  });

  return res.status(200).json({ tickets, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { contactId, status, userId, queueId }: TicketData = req.body;

  const ticket = await CreateTicketService({
    contactId,
    status,
    userId,
    queueId
  });

  const io = getIO();
  io.to(ticket.status).emit("ticket", {
    action: "update",
    ticket
  });

  return res.status(200).json(ticket);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;

  const contact = await ShowTicketService(ticketId);

  return res.status(200).json(contact);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const ticketData: TicketData = req.body;

  const { ticket } = await UpdateTicketService({
    ticketData,
    ticketId
  });

  if (ticketData.transf) {
    const { greetingMessage } = await ShowQueueService(ticketData.queueId);
    if (greetingMessage) {
      const msgtxt = formatBody(`\u200e${greetingMessage}`);
      await SendWhatsAppMessage({ body: msgtxt, ticket });
    }
  }

  if (
    ticket.status === "closed" &&
    ticket.isGroup === false &&
    ticket.user !== null &&
    !ticketData.isFinished
  ) {
    const whatsapp = await ShowWhatsAppService(ticket.whatsappId);

    const { farewellMessage } = whatsapp;

    if (farewellMessage) {
      await SendWhatsAppMessage({
        body: formatBody(`\u200e${farewellMessage}`, ticket),
        ticket
      });
    }

    // Archive chat if enabled
    if (whatsapp.archiveOnClose) {
      try {
        // Only archive if WhatsApp is connected
        if (whatsapp.status === "CONNECTED") {
          const wbot = getWbot(ticket.whatsappId);
          const chatId = `${ticket.contact.number}@c.us`;
          await wbot.archiveChat(chatId);
          logger.info(`[TicketController] Chat archived for ticket ${ticket.id}`);
        } else {
          logger.warn(`[TicketController] Cannot archive chat - WhatsApp not connected (status: ${whatsapp.status})`);
        }
      } catch (err: any) {
        const errorMessage = err?.message || err?.toString() || JSON.stringify(err);
        logger.warn(`[TicketController] Could not archive chat for ticket ${ticket.id}: ${errorMessage}`);
      }
    }
  }
  if (
    ticket.status === "closed" &&
    ticket.isGroup === false &&
    ticketData.isFinished
  ) {
    // Archive chat if enabled (for finished tickets too)
    const whatsapp = await ShowWhatsAppService(ticket.whatsappId);
    if (whatsapp.archiveOnClose) {
      try {
        // Only archive if WhatsApp is connected
        if (whatsapp.status === "CONNECTED") {
          const wbot = getWbot(ticket.whatsappId);
          const chatId = `${ticket.contact.number}@c.us`;
          await wbot.archiveChat(chatId);
          logger.info(`[TicketController] Chat archived for finished ticket ${ticket.id}`);
        } else {
          logger.warn(`[TicketController] Cannot archive chat - WhatsApp not connected (status: ${whatsapp.status})`);
        }
      } catch (err: any) {
        const errorMessage = err?.message || err?.toString() || JSON.stringify(err);
        logger.warn(`[TicketController] Could not archive chat for finished ticket ${ticket.id}: ${errorMessage}`);
      }
    }
  }

  return res.status(200).json(ticket);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;

  const ticket = await DeleteTicketService(ticketId);

  const io = getIO();
  io.to(ticket.status).to(ticketId).to("notification").emit("ticket", {
    action: "delete",
    ticketId: +ticketId
  });

  return res.status(200).json({ message: "ticket deleted" });
};
