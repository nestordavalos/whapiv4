import { Request, Response, NextFunction } from "express";
import { sign } from "jsonwebtoken";
import AppError from "../../../errors/AppError";
import authConfig from "../../../config/auth";

// --- Mock sessionManager before importing isAuth ---
const mockGetLastActivity = jest.fn();
const mockUpdateActivity = jest.fn();
const mockIsExpired = jest.fn();
const mockClearSession = jest.fn();

jest.mock("../../../libs/sessionManager", () => ({
  getLastActivity: (...args: any[]) => mockGetLastActivity(...args),
  updateActivity: (...args: any[]) => mockUpdateActivity(...args),
  isExpired: (...args: any[]) => mockIsExpired(...args),
  clearSession: (...args: any[]) => mockClearSession(...args)
}));

jest.mock("../../../libs/socket", () => ({
  getIO: jest.fn(() => ({ emit: jest.fn() }))
}));

jest.mock("../../../models/User", () => ({
  findByPk: jest.fn()
}));

import isAuth from "../../../middleware/isAuth";

const buildReq = (token?: string): Partial<Request> => ({
  headers: token ? { authorization: `Bearer ${token}` } : {}
});

const buildRes = (): Partial<Response> => ({});

describe("isAuth middleware", () => {
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    next = jest.fn();
    mockIsExpired.mockReturnValue(false);
    mockGetLastActivity.mockReturnValue(undefined);
  });

  it("should throw 401 when no authorization header", async () => {
    const req = buildReq() as Request;
    await expect(isAuth(req, buildRes() as Response, next)).rejects.toThrow(
      AppError
    );
    await expect(isAuth(req, buildRes() as Response, next)).rejects.toMatchObject({
      statusCode: 401,
      message: "ERR_SESSION_EXPIRED"
    });
  });

  it("should call next() for a valid token", async () => {
    const token = sign(
      { id: "1", username: "admin", profile: "admin" },
      authConfig.secret,
      { expiresIn: "1h" }
    );
    const req = buildReq(token) as Request;

    await isAuth(req, buildRes() as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((req as any).user).toEqual({ id: "1", profile: "admin" });
  });

  it("should throw 403 for an invalid / tampered token", async () => {
    const req = buildReq("invalid.token.value") as Request;

    await expect(isAuth(req, buildRes() as Response, next)).rejects.toMatchObject({
      statusCode: 403
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should throw 403 for an expired token", async () => {
    const token = sign(
      { id: "1", username: "admin", profile: "admin" },
      authConfig.secret,
      { expiresIn: "0s" }
    );
    // Small delay so token expires
    await new Promise(r => setTimeout(r, 50));

    const req = buildReq(token) as Request;

    await expect(isAuth(req, buildRes() as Response, next)).rejects.toMatchObject({
      statusCode: 403
    });
  });

  it("should throw 401 when session is expired (inactivity)", async () => {
    mockGetLastActivity.mockReturnValue(Date.now() - 10000);
    mockIsExpired.mockReturnValue(true);

    const User = require("../../../models/User");
    User.findByPk.mockResolvedValue({ update: jest.fn() });

    const token = sign(
      { id: "1", username: "admin", profile: "admin" },
      authConfig.secret,
      { expiresIn: "1h" }
    );
    const req = buildReq(token) as Request;

    await expect(isAuth(req, buildRes() as Response, next)).rejects.toMatchObject({
      statusCode: 401,
      message: "ERR_SESSION_EXPIRED"
    });
    expect(mockClearSession).toHaveBeenCalledWith(1);
  });

  it("should update activity on valid token", async () => {
    const token = sign(
      { id: "5", username: "user5", profile: "user" },
      authConfig.secret,
      { expiresIn: "1h" }
    );
    const req = buildReq(token) as Request;

    await isAuth(req, buildRes() as Response, next);

    expect(mockUpdateActivity).toHaveBeenCalledWith(5);
  });
});
