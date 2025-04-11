import { Request, Response } from "express";

import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";
import { getIO } from "../libs/socket";
import Message from "../models/Message";

import ListMessagesService from "../services/MessageServices/ListMessagesService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import DeleteWhatsAppMessage from "../services/WbotServices/DeleteWhatsAppMessage";
import SendWhatsAppMedia from "../services/WbotServices/SendWhatsAppMedia";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";

type IndexQuery = {
  pageNumber: string;
};

type MessageData = {
  body: string;
  fromMe: boolean;
  read: boolean;
  quotedMsg?: Message;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { pageNumber } = req.query as IndexQuery;
  const userRequest = req.user.id;
  const { count, messages, ticket, hasMore } = await ListMessagesService({
    pageNumber,
    ticketId,
    userRequest
  });

  SetTicketMessagesAsRead(ticket);

  // console.log(req.header)

  return res.json({ count, messages, ticket, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { body, quotedMsg }: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];

  const ticket = await ShowTicketService(ticketId);
  SetTicketMessagesAsRead(ticket);

  const CreateMessageService = (await import("../services/MessageServices/CreateMessageService")).default;

  if (medias && medias.length > 0) {
    await Promise.all(
      medias.map(async (media: Express.Multer.File) => {
        const sentMessage = await SendWhatsAppMedia({ media, ticket });

        const messageData = {
          id: sentMessage.id.id,
          ticketId: ticket.id,
          contactId: undefined,
          body: sentMessage.body || "[archivo]",
          fromMe: true,
          read: true,
          mediaType: sentMessage.type,
          mediaUrl: sentMessage.hasOwnProperty('mediaUrl') ? (sentMessage as any).mediaUrl : null,
          ack: sentMessage.ack
        };

        await CreateMessageService({ messageData });
      })
    );
  } else {
    const sentMessage = await SendWhatsAppMessage({ body, ticket, quotedMsg });

    if (!sentMessage) {
      return res.status(500).json({ error: "No se pudo enviar el mensaje." });
    }

    const messageData = {
      id: sentMessage.id.id,
      ticketId: ticket.id,
      contactId: undefined,
      body: sentMessage.body || body,
      fromMe: true,
      read: true,
      mediaType: sentMessage.type,
      quotedMsgId: quotedMsg?.id,
      ack: sentMessage.ack
    };

    await CreateMessageService({ messageData });
  }

  return res.send();
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
