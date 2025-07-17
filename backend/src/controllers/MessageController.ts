import { Request, Response } from "express";

import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";
import { getIO } from "../libs/socket";
import Message from "../models/Message";

import ListMessagesService from "../services/MessageServices/ListMessagesService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import DeleteWhatsAppMessage from "../services/WbotServices/DeleteWhatsAppMessage";
import SendWhatsAppMedia from "../services/WbotServices/SendWhatsAppMedia";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import CreateMessageService from "../services/MessageServices/CreateMessageService";

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

  let sentMessage;
  if (medias) {
    const messages = [] as Message[];
    for (const media of medias) {
      sentMessage = await SendWhatsAppMedia({ media, ticket });
      const messageData = {
        id: sentMessage.id.id,
        ticketId: ticket.id,
        body: sentMessage.body || body,
        contactId: undefined,
        fromMe: true,
        read: true,
        mediaType: sentMessage.type,
        mediaUrl: media.filename,
        quotedMsgId: quotedMsg?.id,
        ack: sentMessage.ack
      } as any;
      const message = await CreateMessageService({ messageData });
      messages.push(message);
    }
    return res.json(messages);
  } else {
    sentMessage = await SendWhatsAppMessage({ body, ticket, quotedMsg });
    const messageData = {
      id: sentMessage.id.id,
      ticketId: ticket.id,
      body: sentMessage.body,
      contactId: undefined,
      fromMe: true,
      read: true,
      mediaType: sentMessage.type,
      quotedMsgId: quotedMsg?.id,
      ack: sentMessage.ack
    } as any;
    const message = await CreateMessageService({ messageData });
    return res.json(message);
  }
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
