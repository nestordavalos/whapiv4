import pino from "pino";

const isDevelopment = process.env.NODE_ENV !== "production";

const logger = pino(
  isDevelopment
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            levelFirst: true,
            translateTime: true,
            colorize: true
          }
        }
      }
    : {
        level: process.env.LOG_LEVEL || "info"
      }
);

export { logger };
