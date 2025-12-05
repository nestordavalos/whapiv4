import rateLimit from "express-rate-limit";

const isDevelopment = process.env.NODE_ENV !== "production";

// Rate limiter para autenticación (login) - protección contra brute force
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_AUTH || (isDevelopment ? "100" : "50")),
  message: "Too many login attempts, please try again after 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // No contar requests exitosos
});

// Rate limiter para creación de recursos
export const createLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: parseInt(
    process.env.RATE_LIMIT_CREATE || (isDevelopment ? "500" : "200")
  ),
  message: "Too many resource creation requests, please slow down.",
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter para API externa - configurado para integraciones
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: parseInt(process.env.RATE_LIMIT_API || (isDevelopment ? "1000" : "500")),
  message: "API rate limit exceeded. Please wait before making more requests.",
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter para endpoints de mensajería - alto volumen
export const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: parseInt(
    process.env.RATE_LIMIT_MESSAGES || (isDevelopment ? "2000" : "1000")
  ),
  message: "Too many messages sent, please slow down.",
  standardHeaders: true,
  legacyHeaders: false
});
