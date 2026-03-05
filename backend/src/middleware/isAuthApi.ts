import { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "crypto";

import AppError from "../errors/AppError";
import Setting from "../models/Setting";
import { logger } from "../utils/logger";

const isAuthApi = async (
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
    const setting = await Setting.findOne({
      where: { key: "userApiToken" }
    });

    if (!setting || !setting.value) {
      throw new AppError("ERR_SESSION_EXPIRED", 401);
    }

    // Timing-safe comparison to prevent timing attacks
    const expected = Buffer.from(setting.value);
    const received = Buffer.from(token || "");
    const isValid =
      expected.length === received.length &&
      timingSafeEqual(expected, received);

    if (!isValid) {
      throw new AppError("ERR_SESSION_EXPIRED", 401);
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error(`API auth error: ${err}`);
    throw new AppError(
      "Invalid token. We'll try to assign a new one on next request",
      403
    );
  }

  return next();
};

export default isAuthApi;
