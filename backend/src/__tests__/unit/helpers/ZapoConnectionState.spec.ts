import {
  getZapoClosedStatus,
  isZapoPermanentBan,
  isZapoTemporaryBan,
  shouldReconnectZapo
} from "../../../helpers/ZapoConnectionState";

describe("ZapoConnectionState", () => {
  it("recognizes a permanent ban by reason or code", () => {
    expect(isZapoPermanentBan({ reason: "failure_banned", code: null })).toBe(
      true
    );
    expect(isZapoPermanentBan({ reason: "unknown", code: 406 })).toBe(true);
    expect(getZapoClosedStatus({ reason: "failure_banned", code: 406 })).toBe(
      "BANNED"
    );
  });

  it("recognizes a temporary ban from a stream failure", () => {
    expect(isZapoTemporaryBan({ failureReason: 402 })).toBe(true);
    expect(isZapoTemporaryBan({ failureCode: 402 })).toBe(true);
    expect(isZapoTemporaryBan({ failureReason: 503 })).toBe(false);
  });

  it("does not reconnect logout, local disconnect or banned sessions", () => {
    expect(shouldReconnectZapo({ isLogout: true, reason: "unknown" })).toBe(
      false
    );
    expect(
      shouldReconnectZapo({
        isLogout: false,
        reason: "client_disconnected"
      })
    ).toBe(false);
    expect(
      shouldReconnectZapo({
        isLogout: true,
        reason: "failure_banned",
        code: 406
      })
    ).toBe(false);
  });

  it("reconnects an ordinary transport interruption", () => {
    expect(
      shouldReconnectZapo({
        isLogout: false,
        reason: "stream_error_other",
        code: 500
      })
    ).toBe(true);
  });
});
