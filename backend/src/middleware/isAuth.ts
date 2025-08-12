import { verify } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

import AppError from "../errors/AppError";
import authConfig from "../config/auth";
import { isExpired, updateActivity, clearSession } from "../libs/sessionManager";
import { getIO } from "../libs/socket";
import User from "../models/User";

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  iat: number;
  exp: number;
}

const isAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const [, token] = authHeader.split(" ");

  try {
    const decoded = verify(token, authConfig.secret);
    const { id, profile } = decoded as TokenPayload;

    if (isExpired(Number(id))) {
      const user = await User.findByPk(id);
      if (user) await user.update({ online: false });
      clearSession(Number(id));
      try {
        getIO().emit("session:expired", { userId: id });
      } catch (error) {
        // ignore if socket not initialized
      }
      throw new AppError("ERR_SESSION_EXPIRED", 401);
    }

    req.user = {
      id,
      profile
    };

    updateActivity(Number(id));
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError(
      "Invalid token. We'll try to assign a new one on next request",
      403
    );
  }

  return next();
};

export default isAuth;
