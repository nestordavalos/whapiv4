import { Request, Response, NextFunction } from "express";
import AppError from "../errors/AppError";

/**
 * Middleware that checks if the authenticated user has admin profile.
 * Must be used AFTER isAuth middleware.
 */
const isAdmin = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user || req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  return next();
};

export default isAdmin;
