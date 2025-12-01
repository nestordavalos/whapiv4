import gracefulShutdown from "http-graceful-shutdown";
import cron from "node-cron";
import swaggerUi from "swagger-ui-express";
import app from "./app";
import { initIO } from "./libs/socket";
import { logger } from "./utils/logger";
import { StartAllWhatsAppsSessions } from "./services/WbotServices/StartAllWhatsAppsSessions";
import { ClosedAllOpenTickets } from "./services/WbotServices/wbotCloseTickets";

import swaggerDocs from "./swagger.json";

const options = {
  customCss: ".swagger-ui .topbar { display: none }"
};

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs, options));

const server = app.listen(process.env.PORT, () => {
  logger.info(`Servidor iniciado na porta: ${process.env.PORT}`);
});

cron.schedule("*/1 * * * *", async () => {
  try {
    await ClosedAllOpenTickets();
  } catch (error) {
    logger.error(error);
  }
});

initIO(server);
StartAllWhatsAppsSessions().catch(err => logger.error(err));
gracefulShutdown(server);
