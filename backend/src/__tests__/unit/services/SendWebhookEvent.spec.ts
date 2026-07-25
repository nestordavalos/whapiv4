const mockPost = jest.fn();
const mockFindByPk = jest.fn();

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    post: (...args: any[]) => mockPost(...args)
  }
}));

jest.mock("@sentry/node", () => ({
  captureException: jest.fn()
}));

jest.mock("../../../models/Whatsapp", () => ({
  __esModule: true,
  default: {
    findByPk: (...args: any[]) => mockFindByPk(...args)
  }
}));

jest.mock("../../../utils/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

import {
  invalidateWebhookCache,
  sendConnectionHealthWebhook
} from "../../../services/WebhookService/SendWebhookEvent";

describe("sendConnectionHealthWebhook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateWebhookCache(3);
    mockPost.mockResolvedValue({ status: 200 });
  });

  it("sends the Zapo health snapshot using the connection_health event", async () => {
    mockFindByPk
      .mockResolvedValueOnce({
        webhookEnabled: true,
        webhookUrls: JSON.stringify([
          {
            id: "health-hook",
            name: "Health",
            url: "https://example.test/health",
            enabled: true,
            events: ["connection_health"]
          }
        ])
      })
      .mockResolvedValueOnce({
        id: 3,
        name: "Ventas",
        number: "595985523065"
      });

    const health = {
      provider: "zapo",
      whatsappId: 3,
      outreach: {
        status: "healthy",
        quota: { source: null, total: null, used: 0, available: null }
      }
    };

    await sendConnectionHealthWebhook(3, health);

    expect(mockPost).toHaveBeenCalledWith(
      "https://example.test/health",
      expect.objectContaining({
        event: "connection_health",
        connectionId: 3,
        connectionName: "Ventas",
        connectionNumber: "595985523065",
        data: health
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Webhook-Event": "connection_health",
          "X-Connection-Id": "3"
        })
      })
    );
  });
});
