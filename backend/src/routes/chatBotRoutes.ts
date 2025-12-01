import { Router } from "express";
import isAuth from "../middleware/isAuth";

import * as ChatbotController from "../controllers/ChatbotController";

const chatBotRoutes = Router();

chatBotRoutes.get("/chatbot", isAuth, ChatbotController.index);

chatBotRoutes.get("/chatbot/queue/:queueId", isAuth, ChatbotController.listByQueue);

chatBotRoutes.get("/chatbot/chatbot/:chatbotId", isAuth, ChatbotController.listByChatbot);

chatBotRoutes.post("/chatbot", isAuth, ChatbotController.store);

chatBotRoutes.get("/chatbot/:chatbotId", isAuth, ChatbotController.show);

chatBotRoutes.put("/chatbot/:chatbotId", isAuth, ChatbotController.update);

chatBotRoutes.delete("/chatbot/:chatbotId", isAuth, ChatbotController.remove);

export default chatBotRoutes;
