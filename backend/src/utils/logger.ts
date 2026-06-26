import pino from "pino";

const isDevelopment = process.env.NODE_ENV !== "production";
const level = process.env.LOG_LEVEL || "info";
const prettyLogs = process.env.LOG_PRETTY !== "false";

const logger = pino(
  prettyLogs
    ? {
        level,
        transport: {
          target: "pino-pretty",
          options: {
            levelFirst: true,
            translateTime: true,
            colorize: isDevelopment,
            singleLine: true,
            ignore: "pid,hostname"
          }
        }
      }
    : {
        level
      }
);

export { logger };
