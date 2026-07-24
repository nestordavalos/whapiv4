import { isZapoTrustedContactPrivacyNack } from "../../../helpers/ZapoErrors";

describe("isZapoTrustedContactPrivacyNack", () => {
  it("recognizes Zapo's non-retryable trusted-contact NACK 463", () => {
    const error = Object.assign(
      new Error("negative publish ack: tag=ack id=abc error=463"),
      { name: "MessagePublishNackError", retryable: false }
    );

    expect(isZapoTrustedContactPrivacyNack(error)).toBe(true);
  });

  it("does not classify other or retryable NACKs as recipient restrictions", () => {
    const error = Object.assign(
      new Error("negative publish ack: tag=ack id=abc code=503"),
      { name: "MessagePublishNackError", retryable: true }
    );

    expect(isZapoTrustedContactPrivacyNack(error)).toBe(false);
  });
});
