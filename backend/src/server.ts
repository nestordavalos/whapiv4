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

const PORT = parseInt(process.env.PORT || "3333", 10);
if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  logger.error(`Invalid PORT: ${process.env.PORT}. Must be a number between 1 and 65535.`);
  process.exit(1);
}

const server = app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
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
