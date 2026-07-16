import pino from "pino";

const isDevelopment = process.env.NODE_ENV !== "production";
const level = process.env.LOG_LEVEL || "info";
const prettyLogs = process.env.LOG_PRETTY !== "false";

// Pino 9's variadic log signatures require a newer TypeScript inference model
// than this project uses. Keep the runtime logger on the compatible Pino 9
// release required by Zapo, while preserving the permissive structured-log
// calls used throughout this legacy codebase.
const logger: any = pino(
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
