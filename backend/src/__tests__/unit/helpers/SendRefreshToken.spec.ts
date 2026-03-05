import { Response } from "express";
import { SendRefreshToken } from "../../../helpers/SendRefreshToken";

describe("SendRefreshToken", () => {
  let mockCookie: jest.Mock;
  let res: Partial<Response>;

  beforeEach(() => {
    mockCookie = jest.fn();
    res = { cookie: mockCookie } as Partial<Response>;
  });

  it("should set the jrt cookie with the provided token", () => {
    SendRefreshToken(res as Response, "my-refresh-token");

    expect(mockCookie).toHaveBeenCalledTimes(1);
    const [name, value] = mockCookie.mock.calls[0];
    expect(name).toBe("jrt");
    expect(value).toBe("my-refresh-token");
  });

  it("should set httpOnly to true", () => {
    SendRefreshToken(res as Response, "token");

    const options = mockCookie.mock.calls[0][2];
    expect(options.httpOnly).toBe(true);
  });

  it("should set path to /", () => {
    SendRefreshToken(res as Response, "token");

    const options = mockCookie.mock.calls[0][2];
    expect(options.path).toBe("/");
  });

  it("should set maxAge to 7 days", () => {
    SendRefreshToken(res as Response, "token");

    const options = mockCookie.mock.calls[0][2];
    expect(options.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
  });

  describe("in development (NODE_ENV=test)", () => {
    it("should set secure to false", () => {
      SendRefreshToken(res as Response, "token");

      const options = mockCookie.mock.calls[0][2];
      expect(options.secure).toBe(false);
    });

    it("should set sameSite to lax", () => {
      SendRefreshToken(res as Response, "token");

      const options = mockCookie.mock.calls[0][2];
      expect(options.sameSite).toBe("lax");
    });
  });
});
