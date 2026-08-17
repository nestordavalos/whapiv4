import { createHmac, timingSafeEqual } from "crypto";
import authConfig from "../../config/auth";
import AppError from "../../errors/AppError";

const allowedPathPatterns = [
  /^\/$/,
  /^\/tickets(?:\/\d+)?$/,
  /^\/connections$/,
  /^\/contacts$/,
  /^\/users$/,
  /^\/quickAnswers$/,
  /^\/settings$/,
  /^\/api$/,
  /^\/apidocs$/,
  /^\/apikey$/,
  /^\/queues$/,
  /^\/tags$/,
  /^\/queue-integrations$/
];

export const normalizeOrigin = (value: string): string => {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new AppError("ERR_INVALID_EMBED_ORIGIN", 400);
  }

  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (url.protocol === "http:" &&
      !["localhost", "127.0.0.1"].includes(url.hostname))
  ) {
    throw new AppError("ERR_INVALID_EMBED_ORIGIN", 400);
  }

  return url.origin;
};

export const normalizeOrigins = (values: unknown): string[] => {
  if (!Array.isArray(values) || values.length === 0 || values.length > 20) {
    throw new AppError("ERR_INVALID_EMBED_ORIGIN", 400);
  }

  return [...new Set(values.map(value => normalizeOrigin(String(value))))];
};

export const normalizeEmbedPath = (value?: string): string => {
  const path = (value || "/tickets").trim();
  if (!allowedPathPatterns.some(pattern => pattern.test(path))) {
    throw new AppError("ERR_INVALID_EMBED_PATH", 400);
  }
  return path;
};

export const createEmbedToken = (
  publicId: string,
  secretVersion: string
): string =>
  createHmac("sha256", process.env.EMBED_TOKEN_SECRET || authConfig.secret)
    .update(`${publicId}:${secretVersion}`)
    .digest("base64url");

export const isValidEmbedToken = (
  candidate: string,
  publicId: string,
  secretVersion: string
): boolean => {
  const expected = Buffer.from(createEmbedToken(publicId, secretVersion));
  const received = Buffer.from(candidate || "");
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
};

export const getPublicBackendUrl = (): string => {
  const configured = process.env.EMBED_PUBLIC_URL || process.env.BACKEND_URL;
  if (!configured) {
    throw new Error("EMBED_PUBLIC_URL or BACKEND_URL must be configured");
  }

  const url = new URL(configured);
  if (!url.port && process.env.PROXY_PORT) url.port = process.env.PROXY_PORT;
  return url.origin;
};
