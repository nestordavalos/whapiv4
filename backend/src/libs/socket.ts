import { Server as SocketIO } from "socket.io";
import { Server } from "http";
import { verify } from "jsonwebtoken";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";
import authConfig from "../config/auth";
import User from "../models/User";
import { updateActivity, clearSession } from "./sessionManager";

interface SocketTokenPayload {
  id: string;
  username: string;
  profile: string;
  iat: number;
  exp: number;
}

let io: SocketIO;

export const initIO = (httpServer: Server): SocketIO => {
  io = new SocketIO(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL
    },
    transports: ["websocket", "polling"]
  });

  io.on("connection", async socket => {
    const { token } = socket.handshake.query;
    let tokenData: SocketTokenPayload | null = null;
    try {
      const tokenString = Array.isArray(token) ? token[0] : token; // Ensure token is a string
      tokenData = verify(tokenString, authConfig.secret) as SocketTokenPayload;
      logger.debug(JSON.stringify(tokenData), "io-onConnection: tokenData");
    } catch (error) {
      logger.error(JSON.stringify(error), "Error decoding token");
      socket.disconnect();
      return io;
    }

    const user = await User.findByPk(tokenData.id);
    if (!user) {
      socket.disconnect();
      return io;
    }
    await user.update({ online: true });
    socket.join(String(user.id));
    updateActivity(user.id);

    socket.onAny((event, ...args) => {
      logger.info({ event, args }, "socket event");
      updateActivity(user.id);
    });

    socket.on("joinChatBox", (ticketId: string) => {
      logger.info("A client joined a ticket channel");
      socket.join(ticketId);
    });

    socket.on("joinNotification", () => {
      logger.info("A client joined notification channel");
      socket.join("notification");
    });

    socket.on("joinTickets", (status: string) => {
      logger.info(`A client joined to ${status} tickets channel.`);
      socket.join(status);
    });

    socket.on("userStatus", async status => {
      await user.update({ online: status === "online" });
      io.emit("userStatus", { userId: user.id, status });
    });

    socket.on("logout", async () => {
      clearSession(user.id);
      await user.update({ online: false });
      socket.disconnect();
    });

    socket.on("disconnect", async () => {
      clearSession(user.id);
      await user.update({ online: false });
    });

    return socket;
  });
  return io;
};

export const getIO = (): SocketIO => {
  if (!io) {
    throw new AppError("Socket IO not initialized");
  }
  return io;
};
