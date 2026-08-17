import { Router } from "express";
import isAuth from "../middleware/isAuth";
import isAdmin from "../middleware/isAdmin";
import { authLimiter } from "../middleware/rateLimiters";
import * as EmbedIntegrationController from "../controllers/EmbedIntegrationController";

const routes = Router();

routes.get("/embed/:publicId", EmbedIntegrationController.shell);
routes.post(
  "/embed-integrations/:publicId/exchange",
  authLimiter,
  EmbedIntegrationController.exchange
);
routes.get(
  "/embed-integrations/users",
  isAuth,
  isAdmin,
  EmbedIntegrationController.users
);
routes.get(
  "/embed-integrations",
  isAuth,
  isAdmin,
  EmbedIntegrationController.index
);
routes.post(
  "/embed-integrations",
  isAuth,
  isAdmin,
  EmbedIntegrationController.store
);
routes.put(
  "/embed-integrations/:integrationId",
  isAuth,
  isAdmin,
  EmbedIntegrationController.update
);
routes.post(
  "/embed-integrations/:integrationId/rotate",
  isAuth,
  isAdmin,
  EmbedIntegrationController.rotate
);
routes.delete(
  "/embed-integrations/:integrationId",
  isAuth,
  isAdmin,
  EmbedIntegrationController.remove
);

export default routes;
