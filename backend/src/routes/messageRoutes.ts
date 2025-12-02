import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";

import * as MessageController from "../controllers/MessageController";

const messageRoutes = Router();

const upload = multer(uploadConfig);
messageRoutes.get("/messages/:ticketId", isAuth, MessageController.index);
messageRoutes.post(
  "/messages/:ticketId",
  isAuth,
  upload.array("medias"),
  MessageController.store
);
messageRoutes.post("/messages/:ticketId/sync", isAuth, MessageController.sync);
messageRoutes.post(
  "/messages/:messageId/forward",
  isAuth,
  MessageController.forward
);
messageRoutes.put("/messages/:messageId", isAuth, MessageController.edit);
messageRoutes.delete("/messages/:messageId", isAuth, MessageController.remove);

export default messageRoutes;
