import gracefulShutdown from "http-graceful-shutdown";
import cron from "node-cron";
import swaggerUi from "swagger-ui-express";
import app from "./app";
import { initIO } from "./libs/socket";
import { logger } from "./utils/logger";
import { StartAllWhatsAppsSessions } from "./services/WbotServices/StartAllWhatsAppsSessions";
import { ClosedAllOpenTickets } from "./services/WbotServices/wbotCloseTickets";
import StorageSyncService from "./services/StorageServices/StorageSyncService";
import getStorageConfig from "./config/storage";

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

// Initialize storage sync service for S3/S3-compatible storage
const storageConfig = getStorageConfig();
if (storageConfig.type !== "local" && storageConfig.fallbackToLocal) {
  const syncService = new StorageSyncService();
  // Sync pending uploads every 5 minutes
  syncService.startAutoSync(5 * 60 * 1000);
  logger.info("Storage sync service started (interval: 5 minutes)");
}

initIO(server);
StartAllWhatsAppsSessions().catch(err => logger.error(err));
gracefulShutdown(server);
