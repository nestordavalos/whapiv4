import { v4 as uuidv4 } from "uuid";
import { Request, Response, NextFunction } from "express";

/**
 * Middleware that assigns a unique request ID to every incoming request.
 *
 * If the client already sends an `X-Request-Id` header (e.g. from a load
 * balancer or API gateway), we reuse it; otherwise a new UUIDv4 is generated.
 *
 * The ID is attached to `req.id` and sent back in the `X-Request-Id` response
 * header so callers can correlate logs.
 */
const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const id =
    (req.headers["x-request-id"] as string) || uuidv4();
  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
};

export default requestId;
