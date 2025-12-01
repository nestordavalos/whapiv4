import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import CreateChatBotServices from "../services/ChatBotServices/CreateChatBotServices";
import DeleteChatBotServices from "../services/ChatBotServices/DeleteChatBotServices";
import ListChatBotServices from "../services/ChatBotServices/ListChatBotServices";
import ListChatBotByQueueService from "../services/ChatBotServices/ListChatBotByQueueService";
import ListChatBotByChatbotIdService from "../services/ChatBotServices/ListChatBotByChatbotIdService";
import ShowChatBotServices from "../services/ChatBotServices/ShowChatBotServices";
import UpdateChatBotServices from "../services/ChatBotServices/UpdateChatBotServices";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const queues = await ListChatBotServices();

  return res.status(200).json(queues);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { name, color, greetingMessage, mediaPath, queueId, chatbotId, isAgent } = req.body;

  const chatbot = await CreateChatBotServices({ 
    name, 
    color, 
    greetingMessage,
    mediaPath,
    queueId,
    chatbotId,
    isAgent
  });
  
  const io = getIO();
  io.emit("chatbot", {
    action: "update",
    chatbot
  });

  return res.status(200).json(chatbot);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { chatbotId } = req.params;

  const queue = await ShowChatBotServices(chatbotId);
  return res.status(200).json(queue);
};

export const listByQueue = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { queueId } = req.params;

  const chatbots = await ListChatBotByQueueService(queueId);
  return res.status(200).json(chatbots);
};

export const listByChatbot = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { chatbotId } = req.params;

  const chatbots = await ListChatBotByChatbotIdService(chatbotId);
  return res.status(200).json(chatbots);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { chatbotId } = req.params;

  const chatbot = await UpdateChatBotServices(chatbotId, req.body);

  const io = getIO();
  io.emit("chatbot", {
    action: "update",
    chatbot
  });

  return res.status(201).json(chatbot);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { chatbotId } = req.params;

  await DeleteChatBotServices(chatbotId);

  const io = getIO();
  io.emit("chatbot", {
    action: "delete",
    chatbotId: +chatbotId
  });

  return res.status(200).send();
};
