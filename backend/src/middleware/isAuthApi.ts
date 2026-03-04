import { Request, Response, NextFunction } from "express";
import { compare } from "bcryptjs";

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

    // Support both hashed and legacy plaintext tokens
    const isHashed = setting.value.startsWith("$2");
    const isValid = isHashed
      ? await compare(token, setting.value)
      : token === setting.value;

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
