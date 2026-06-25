import pino from "pino";

const isDevelopment = process.env.NODE_ENV !== "production";
const level = process.env.LOG_LEVEL || "info";

const logger = pino(
  isDevelopment
    ? {
        level,
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
        level
      }
);

export { logger };
