import { Request, Response } from "express";
import { Message as WbotMessage } from "whatsapp-web.js";

import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";
import { getIO } from "../libs/socket";

import ListMessagesService from "../services/MessageServices/ListMessagesService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import DeleteWhatsAppMessage from "../services/WbotServices/DeleteWhatsAppMessage";
import SendWhatsAppMedia from "../services/WbotServices/SendWhatsAppMedia";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import CreateMessageService from "../services/MessageServices/CreateMessageService";

type IndexQuery = {
  pageNumber: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { pageNumber } = req.query as IndexQuery;
  const { count, messages, ticket, hasMore } = await ListMessagesService({
    pageNumber,
    ticketId
  });

  SetTicketMessagesAsRead(ticket);

  // console.log(req.header)

  return res.json({ count, messages, ticket, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { body } = req.body;

  let quotedMsg;
  if (req.body.quotedMsg) {
    quotedMsg =
      typeof req.body.quotedMsg === "string"
        ? JSON.parse(req.body.quotedMsg)
        : req.body.quotedMsg;
  }

  const medias = req.files as Express.Multer.File[] | undefined;

  const ticket = await ShowTicketService(ticketId);

  SetTicketMessagesAsRead(ticket);

  if (medias && medias.length > 0) {
    // Validar que no se excedan los límites
    if (medias.length > 10) {
      return res.status(400).json({
        error: "Máximo 10 archivos permitidos por mensaje"
      });
    }

    const messages = await Promise.all(
      medias.map(async (media: Express.Multer.File) => {
        const sentMsg: WbotMessage = await SendWhatsAppMedia({
          media,
          ticket,
          body,
          quotedMsg
        });

        const timestamp = sentMsg.timestamp
          ? new Date(sentMsg.timestamp * 1000)
          : new Date();

        const message = await CreateMessageService({
          messageData: {
            id: sentMsg.id.id,
            ticketId: ticket.id,
            body: sentMsg.body || body,
            fromMe: true,
            read: true,
            mediaUrl: media.filename,
            mediaType: media.mimetype.split("/")[0],
            quotedMsgId: quotedMsg?.id,
            createdAt: timestamp,
            updatedAt: timestamp
          }
        });
        return message;
      })
    );
    return res.json(messages);
  }

  const sentMsg: WbotMessage = await SendWhatsAppMessage({
    body,
    ticket,
    quotedMsg
  });

  const timestamp = sentMsg.timestamp
    ? new Date(sentMsg.timestamp * 1000)
    : new Date();

  const message = await CreateMessageService({
    messageData: {
      id: sentMsg.id.id,
      ticketId: ticket.id,
      body: sentMsg.body,
      fromMe: true,
      read: true,
      quotedMsgId: quotedMsg?.id,
      createdAt: timestamp,
      updatedAt: timestamp
    }
  });

  return res.json(message);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId } = req.params;

  const message = await DeleteWhatsAppMessage(messageId);

  const io = getIO();
  io.to(message.ticketId.toString()).emit("appMessage", {
    action: "update",
    message
  });

  return res.send();
};

export const mediaUpload = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const medias = req.files as Express.Multer.File[] | undefined;

  if (!medias || medias.length === 0) {
    return res.status(400).json({ error: "No se enviaron archivos" });
  }

  // Retornar solo los nombres de los archivos guardados
  const filenames = medias.map(media => media.filename);

  return res.json(filenames);
};
