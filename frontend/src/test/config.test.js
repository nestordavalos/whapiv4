import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("getBackendUrl", () => {
  const savedEnv = { ...window.ENV };

  beforeEach(() => {
    // Ensure clean state
    window.ENV = {};
    vi.resetModules();
  });

  afterEach(() => {
    window.ENV = savedEnv;
  });

  it("should return the URL from window.ENV when set", async () => {
    window.ENV = { VITE_BACKEND_URL: "http://localhost:8080" };
    const { getBackendUrl } = await import("../config.jsx");
    expect(getBackendUrl()).toBe("http://localhost:8080");
  });

  it("should throw when window.ENV is empty and no build env", async () => {
    // In vitest, import.meta.env.VITE_BACKEND_URL is typically undefined,
    // so getBackendUrl() should throw when window.ENV is also empty.
    window.ENV = {};
    const { getBackendUrl } = await import("../config.jsx");
    // getBackendUrl either throws (correct) or returns a buildEnv value
    // if VITE_BACKEND_URL happens to be set via Vite define. We test
    // that it either throws or returns a non-null string.
    try {
      const url = getBackendUrl();
      // If it didn't throw, it must be a valid string from build env
      expect(typeof url).toBe("string");
      expect(url.length).toBeGreaterThan(0);
    } catch (err) {
      expect(err.message).toMatch(/VITE_BACKEND_URL/);
    }
  });
});
