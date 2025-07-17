import { Request, Response } from "express";

import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";
import { getIO } from "../libs/socket";
import Message from "../models/Message";

import ListMessagesService from "../services/MessageServices/ListMessagesService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import DeleteWhatsAppMessage from "../services/WbotServices/DeleteWhatsAppMessage";
import SendWhatsAppMedia from "../services/WbotServices/SendWhatsAppMedia";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import CreateMessageService, {
  CreateMessageData
} from "../services/MessageServices/CreateMessageService";

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


  return res.json({ count, messages, ticket, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { body, quotedMsg }: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];

  const ticket = await ShowTicketService(ticketId);

  SetTicketMessagesAsRead(ticket);

  const buildAndSave = async (
    sent: any,
    media?: Express.Multer.File
  ): Promise<Message> => {
    const messageData: CreateMessageData = {
      id: sent.id.id,
      ticketId: ticket.id,
      body: sent.body || body,
      contactId: undefined,
      fromMe: true,
      read: true,
      mediaType: sent.type,
      mediaUrl: media?.filename,
      quotedMsgId: quotedMsg?.id,
      ack: sent.ack,
      createdAt: new Date(Number(sent.timestamp) * 1000)
    };

    return CreateMessageService({ messageData });
  };

  if (medias && medias.length > 0) {
    const messages = await Promise.all(
      medias.map(async media => {
        const sent = await SendWhatsAppMedia({ media, ticket });
        return buildAndSave(sent, media);
      })
    );
    return res.json(messages);
  }

  const sent = await SendWhatsAppMessage({ body, ticket, quotedMsg });
  const message = await buildAndSave(sent);
  return res.json([message]);
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
