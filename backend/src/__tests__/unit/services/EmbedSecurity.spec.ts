import AppError from "../../../errors/AppError";
import {
  createEmbedToken,
  isValidEmbedToken,
  normalizeEmbedPath,
  normalizeOrigin,
  normalizeOrigins
} from "../../../services/EmbedServices/EmbedSecurity";

describe("EmbedSecurity", () => {
  describe("normalizeOrigin", () => {
    it("accepts secure origins and removes the trailing slash", () => {
      expect(normalizeOrigin("https://portal.example.com/")).toBe(
        "https://portal.example.com"
      );
    });

    it("accepts http only for local development", () => {
      expect(normalizeOrigin("http://localhost:3000")).toBe(
        "http://localhost:3000"
      );
      expect(() => normalizeOrigin("http://portal.example.com")).toThrow(
        AppError
      );
    });

    it("rejects paths, credentials and empty origin lists", () => {
      expect(() => normalizeOrigin("https://example.com/path")).toThrow(
        AppError
      );
      expect(() => normalizeOrigin("https://user@example.com")).toThrow(
        AppError
      );
      expect(() => normalizeOrigins([])).toThrow(AppError);
    });

    it("deduplicates configured origins", () => {
      expect(
        normalizeOrigins([
          "https://portal.example.com",
          "https://portal.example.com/"
        ])
      ).toEqual(["https://portal.example.com"]);
    });
  });

  describe("normalizeEmbedPath", () => {
    it.each(["/", "/tickets", "/tickets/123", "/settings"])(
      "accepts %s",
      path => expect(normalizeEmbedPath(path)).toBe(path)
    );

    it.each([
      "https://malicious.example",
      "//malicious.example",
      "/tickets/not-a-number",
      "/unknown"
    ])("rejects %s", path => {
      expect(() => normalizeEmbedPath(path)).toThrow(AppError);
    });
  });

  it("creates a stable token that is invalidated by rotation", () => {
    const token = createEmbedToken("public-id", "version-1");
    expect(isValidEmbedToken(token, "public-id", "version-1")).toBe(true);
    expect(isValidEmbedToken(token, "public-id", "version-2")).toBe(false);
    expect(isValidEmbedToken("invalid", "public-id", "version-1")).toBe(false);
  });
});
