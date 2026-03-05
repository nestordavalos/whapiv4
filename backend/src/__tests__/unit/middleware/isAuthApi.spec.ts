import { Request, Response, NextFunction } from "express";
import AppError from "../../../errors/AppError";

// --- Mock Setting model ---
const mockFindOne = jest.fn();
jest.mock("../../../models/Setting", () => ({
  findOne: (...args: any[]) => mockFindOne(...args)
}));

jest.mock("../../../utils/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() }
}));

import isAuthApi from "../../../middleware/isAuthApi";

const buildReq = (token?: string): Partial<Request> => ({
  headers: token ? { authorization: `Bearer ${token}` } : {}
});

const buildRes = (): Partial<Response> => ({});

describe("isAuthApi middleware", () => {
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    next = jest.fn();
  });

  it("should throw 401 when no authorization header", async () => {
    const req = buildReq() as Request;
    await expect(
      isAuthApi(req, buildRes() as Response, next)
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("should throw 401 when no API token configured in DB", async () => {
    mockFindOne.mockResolvedValue(null);
    const req = buildReq("some-token") as Request;
    await expect(
      isAuthApi(req, buildRes() as Response, next)
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("should throw 401 when token does not match", async () => {
    mockFindOne.mockResolvedValue({ value: "correct-token-abc" });
    const req = buildReq("wrong-token-xyz") as Request;
    await expect(
      isAuthApi(req, buildRes() as Response, next)
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("should call next() when token matches", async () => {
    const apiToken = "my-secret-api-token-12345";
    mockFindOne.mockResolvedValue({ value: apiToken });
    const req = buildReq(apiToken) as Request;

    await isAuthApi(req, buildRes() as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should use timing-safe comparison (same-length tokens)", async () => {
    // Tokens of same length but different content should still fail
    mockFindOne.mockResolvedValue({ value: "abcdefghij" });
    const req = buildReq("0123456789") as Request;
    await expect(
      isAuthApi(req, buildRes() as Response, next)
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("should reject when token lengths differ", async () => {
    mockFindOne.mockResolvedValue({ value: "short" });
    const req = buildReq("a-much-longer-token") as Request;
    await expect(
      isAuthApi(req, buildRes() as Response, next)
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});
