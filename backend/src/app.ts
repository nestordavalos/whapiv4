import "./bootstrap";
import "reflect-metadata";
import "express-async-errors";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import * as Sentry from "@sentry/node";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import "./database";
import uploadConfig from "./config/upload";
import AppError from "./errors/AppError";
import routes from "./routes";
import { logger } from "./utils/logger";

Sentry.init({ dsn: process.env.SENTRY_DSN });

const app = express();

// CORS debe ir ANTES de Helmet para que funcione correctamente
app.use(
  cors({
    credentials: true,
    origin: process.env.FRONTEND_URL || "http://localhost:3000"
  })
);

// Security headers - configurado para no interferir con CORS
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false // Deshabilitado para Swagger, ajustar según necesidad
  })
);

// Rate limiting general - configurado para alto tráfico
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_GENERAL || (process.env.NODE_ENV === "production" ? "5000" : "10000")),
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and public assets
    return req.path === '/health' || req.path.startsWith('/public/');
  }
});

app.use(generalLimiter);
app.use(cookieParser());
app.use(express.json());
app.use(Sentry.Handlers.requestHandler());
app.use("/public", express.static(uploadConfig.directory));
app.use(routes);

app.use(Sentry.Handlers.errorHandler());

app.use(async (err: Error, req: Request, res: Response, _: NextFunction) => {
  if (err instanceof AppError) {
    logger.warn(err);
    return res.status(err.statusCode).json({ error: err.message });
  }

  logger.error(err);
  return res.status(500).json({ error: "Internal server error" });
});

export default app;
