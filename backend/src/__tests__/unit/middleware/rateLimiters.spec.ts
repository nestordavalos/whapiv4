/**
 * Tests for rate limiter configurations.
 *
 * express-rate-limit v8 uses `node:net` which Jest 26 cannot resolve.
 * Instead of importing the actual module, we mock express-rate-limit and
 * verify that each limiter is created with the expected configuration.
 */

// Capture all calls to rateLimit()
const rateLimitCalls: any[] = [];
const mockMiddleware = jest.fn((_req: any, _res: any, next: any) => next());

jest.mock("express-rate-limit", () => {
  return {
    __esModule: true,
    default: (opts: any) => {
      rateLimitCalls.push(opts);
      return mockMiddleware;
    }
  };
});

// Now import the module under test — it will use our mock
import {
  authLimiter,
  createLimiter,
  apiLimiter,
  messageLimiter
} from "../../../middleware/rateLimiters";

describe("rateLimiters", () => {
  it("should export all four limiters as functions", () => {
    expect(typeof authLimiter).toBe("function");
    expect(typeof createLimiter).toBe("function");
    expect(typeof apiLimiter).toBe("function");
    expect(typeof messageLimiter).toBe("function");
  });

  it("should create exactly 4 rate limiters", () => {
    expect(rateLimitCalls).toHaveLength(4);
  });

  describe("authLimiter (login brute-force protection)", () => {
    it("should have 15 minute window", () => {
      const opts = rateLimitCalls[0];
      expect(opts.windowMs).toBe(15 * 60 * 1000);
    });

    it("should skip successful requests", () => {
      const opts = rateLimitCalls[0];
      expect(opts.skipSuccessfulRequests).toBe(true);
    });

    it("should use standard headers", () => {
      const opts = rateLimitCalls[0];
      expect(opts.standardHeaders).toBe(true);
      expect(opts.legacyHeaders).toBe(false);
    });
  });

  describe("createLimiter (signup)", () => {
    it("should have 1 minute window", () => {
      const opts = rateLimitCalls[1];
      expect(opts.windowMs).toBe(60 * 1000);
    });

    it("should have low max in production (5) and higher in dev (50)", () => {
      const opts = rateLimitCalls[1];
      // In test env (non-production), should use dev value
      expect(opts.max).toBe(50);
    });
  });

  describe("apiLimiter (external API)", () => {
    it("should have 1 minute window", () => {
      const opts = rateLimitCalls[2];
      expect(opts.windowMs).toBe(60 * 1000);
    });

    it("should allow higher throughput (1000 in dev)", () => {
      const opts = rateLimitCalls[2];
      expect(opts.max).toBe(1000);
    });
  });

  describe("messageLimiter (messaging endpoints)", () => {
    it("should have 1 minute window", () => {
      const opts = rateLimitCalls[3];
      expect(opts.windowMs).toBe(60 * 1000);
    });

    it("should allow highest throughput (2000 in dev)", () => {
      const opts = rateLimitCalls[3];
      expect(opts.max).toBe(2000);
    });
  });
});
