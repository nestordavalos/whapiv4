import { Router } from "express";

import userRoutes from "./userRoutes";
import authRoutes from "./authRoutes";
import settingRoutes from "./settingRoutes";
import contactRoutes from "./contactRoutes";
import ticketRoutes from "./ticketRoutes";
import whatsappRoutes from "./whatsappRoutes";
import messageRoutes from "./messageRoutes";
import whatsappSessionRoutes from "./whatsappSessionRoutes";
import queueRoutes from "./queueRoutes";
import quickAnswerRoutes from "./quickAnswerRoutes";
import apiRoutes from "./apiRoutes";
import webhookApiRoutes from "./webhookApiRoutes";
import chatBot from "./chatBotRoutes";
import tagRoutes from "./tagRoutes";
import dashboardRoutes from "./dashboardRoutes";
import systemRoutes from "./systemRoutes";
import queueIntegrationRoutes from "./queueIntegrationRoutes";
import storageRoutes from "./storageRoutes";

const routes = Router();

routes.use(userRoutes);
routes.use("/auth", authRoutes);
routes.use(settingRoutes);
routes.use(contactRoutes);
routes.use(ticketRoutes);
routes.use(whatsappRoutes);
routes.use(messageRoutes);
routes.use(whatsappSessionRoutes);
routes.use(queueRoutes);
routes.use(quickAnswerRoutes);
routes.use(chatBot);
routes.use("/api", apiRoutes);
routes.use("/api/v1", webhookApiRoutes);
routes.use(tagRoutes);
routes.use(dashboardRoutes);
routes.use(systemRoutes);
routes.use(queueIntegrationRoutes);
routes.use(storageRoutes);

export default routes;
