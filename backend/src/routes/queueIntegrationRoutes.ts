import { Router } from "express";
import isAuth from "../middleware/isAuth";

import * as QueueIntegrationController from "../controllers/QueueIntegrationController";

const queueIntegrationRoutes = Router();

queueIntegrationRoutes.get(
  "/queue-integrations",
  isAuth,
  QueueIntegrationController.index
);

queueIntegrationRoutes.get(
  "/queue-integrations/:integrationId",
  isAuth,
  QueueIntegrationController.show
);

queueIntegrationRoutes.post(
  "/queue-integrations",
  isAuth,
  QueueIntegrationController.store
);

queueIntegrationRoutes.put(
  "/queue-integrations/:integrationId",
  isAuth,
  QueueIntegrationController.update
);

queueIntegrationRoutes.delete(
  "/queue-integrations/:integrationId",
  isAuth,
  QueueIntegrationController.remove
);

export default queueIntegrationRoutes;
