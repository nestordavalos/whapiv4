import express from "express";
import multer from "multer";
import uploadConfig from "../config/upload";

import * as ApiController from "../controllers/ApiController";
import isAuthApi from "../middleware/isAuthApi";
import { apiLimiter } from "../middleware/rateLimiters";

const upload = multer(uploadConfig);

const ApiRoutes = express.Router();

ApiRoutes.post(
  "/send",
  apiLimiter,
  isAuthApi,
  upload.array("medias"),
  ApiController.index
);
ApiRoutes.get("/queue/list", apiLimiter, isAuthApi, ApiController.list);

export default ApiRoutes;
