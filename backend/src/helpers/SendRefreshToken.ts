import { Response } from "express";

export const SendRefreshToken = (res: Response, token: string): void => {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("jrt", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/"
  });
};
