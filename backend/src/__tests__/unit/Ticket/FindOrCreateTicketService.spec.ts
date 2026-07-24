import Ticket from "../../../models/Ticket";
import FindOrCreateTicketService from "../../../services/TicketServices/FindOrCreateTicketService";
import ListSettingsServiceOne from "../../../services/SettingServices/ListSettingsServiceOne";
import ShowTicketService from "../../../services/TicketServices/ShowTicketService";

jest.mock("../../../models/Ticket", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn()
  }
}));

jest.mock("../../../services/SettingServices/ListSettingsServiceOne");
jest.mock("../../../services/TicketServices/ShowTicketService");
jest.mock("../../../services/WebhookService/SendWebhookEvent", () => ({
  sendTicketCreatedWebhook: jest.fn()
}));

describe("FindOrCreateTicketService API ticket reuse", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reuses and reopens the latest ticket without applying the age window", async () => {
    const existingTicket = {
      id: 41,
      status: "closed",
      update: jest.fn(async function update(values) {
        Object.assign(this, values);
      })
    };

    (Ticket.findOne as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingTicket);
    (ShowTicketService as jest.Mock).mockResolvedValue(existingTicket);

    const result = await FindOrCreateTicketService(
      { id: 7 } as any,
      3,
      1,
      null,
      null,
      null,
      undefined,
      { reuseLatestTicket: true }
    );

    expect(Ticket.findOne).toHaveBeenCalledTimes(2);
    expect(Ticket.findOne).toHaveBeenLastCalledWith({
      where: { contactId: 7, whatsappId: 3 },
      order: [["updatedAt", "DESC"]]
    });
    expect(existingTicket.update).toHaveBeenCalledWith({
      unreadMessages: 1,
      isBot: true,
      status: "pending",
      userId: null,
      queueId: null
    });
    expect(ListSettingsServiceOne).not.toHaveBeenCalled();
    expect(Ticket.create).not.toHaveBeenCalled();
    expect(result).toBe(existingTicket);
  });
});
