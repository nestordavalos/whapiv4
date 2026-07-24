import { clearAllZapoInternalStores } from "../../../helpers/ZapoStoreReset";

describe("clearAllZapoInternalStores", () => {
  it("clears every provider-owned Zapo domain for the selected session", async () => {
    const clearByDomain = new Map<string, jest.Mock>();
    const factory = (domain: string) => (sessionId: string) => {
      expect(sessionId).toBe("whatsapp-38");
      const clear = jest.fn().mockResolvedValue(undefined);
      clearByDomain.set(domain, clear);
      return { clear };
    };

    const mysql = {
      stores: {
        auth: factory("auth"),
        signal: factory("signal"),
        preKey: factory("preKey"),
        session: factory("session"),
        identity: factory("identity"),
        senderKey: factory("senderKey"),
        appState: factory("appState"),
        privacyToken: factory("privacyToken"),
        contacts: factory("contacts"),
        threads: factory("threads"),
        messages: factory("messages")
      },
      caches: {
        retry: factory("retry"),
        groupMetadata: factory("groupMetadata"),
        deviceList: factory("deviceList"),
        messageSecret: factory("messageSecret")
      }
    };

    const cleared = await clearAllZapoInternalStores(mysql, "whatsapp-38");

    expect(cleared).toBe(15);
    expect([...clearByDomain.keys()]).toEqual([
      "auth",
      "signal",
      "preKey",
      "session",
      "identity",
      "senderKey",
      "appState",
      "privacyToken",
      "contacts",
      "threads",
      "messages",
      "retry",
      "groupMetadata",
      "deviceList",
      "messageSecret"
    ]);
    clearByDomain.forEach(clear => expect(clear).toHaveBeenCalledTimes(1));
  });
});
