import {
  getLastActivity,
  updateActivity,
  isExpired,
  clearSession
} from "../../../libs/sessionManager";

describe("sessionManager", () => {
  beforeEach(() => {
    // Clear any lingering sessions from other tests
    clearSession(999);
  });

  it("should return undefined for an unknown user", () => {
    expect(getLastActivity(999)).toBeUndefined();
  });

  it("should store and retrieve activity", () => {
    const now = Date.now();
    updateActivity(999, now);
    expect(getLastActivity(999)).toBe(now);
  });

  it("should update activity with current time when no timestamp provided", () => {
    const before = Date.now();
    updateActivity(999);
    const after = Date.now();
    const stored = getLastActivity(999)!;
    expect(stored).toBeGreaterThanOrEqual(before);
    expect(stored).toBeLessThanOrEqual(after);
  });

  it("should clear session", () => {
    updateActivity(999, Date.now());
    expect(getLastActivity(999)).toBeDefined();
    clearSession(999);
    expect(getLastActivity(999)).toBeUndefined();
  });

  it("isExpired should return true for old timestamps", () => {
    const eightHoursAgo = Date.now() - 8 * 60 * 60 * 1000 - 1000;
    expect(isExpired(eightHoursAgo)).toBe(true);
  });

  it("isExpired should return false for recent timestamps", () => {
    expect(isExpired(Date.now())).toBe(false);
  });

  it("isExpired should accept a custom limit", () => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000 - 100;
    expect(isExpired(fiveMinutesAgo, 5 * 60 * 1000)).toBe(true);
    expect(isExpired(Date.now(), 5 * 60 * 1000)).toBe(false);
  });
});
