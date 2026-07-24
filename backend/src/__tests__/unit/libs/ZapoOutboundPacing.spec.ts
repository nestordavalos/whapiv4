import {
  API_OUTBOUND_MESSAGE_DELAY_MAX_MS,
  API_OUTBOUND_MESSAGE_DELAY_MIN_MS,
  DEFAULT_ZAPO_OUTBOUND_DELAY_MS,
  getZapoOutboundDelayMs
} from "../../../libs/ZapoOutboundPacing";

describe("getZapoOutboundDelayMs", () => {
  it.each([undefined, "frontend", "automation"] as const)(
    "keeps the existing fixed delay for %s sends",
    source => {
      expect(getZapoOutboundDelayMs(source)).toBe(
        DEFAULT_ZAPO_OUTBOUND_DELAY_MS
      );
    }
  );

  it("returns the configured minimum for API sends", () => {
    expect(getZapoOutboundDelayMs("api", () => 0)).toBe(
      API_OUTBOUND_MESSAGE_DELAY_MIN_MS
    );
  });

  it("returns the configured maximum for API sends", () => {
    expect(getZapoOutboundDelayMs("api", () => 0.999999999)).toBe(
      API_OUTBOUND_MESSAGE_DELAY_MAX_MS
    );
  });
});
