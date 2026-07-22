import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Chatbot from "../../models/Chatbot";
import ShowChatBotServices from "../ChatBotServices/ShowChatBotServices";
import ShowDialogChatBotsServices from "../DialogChatBotsServices/ShowDialogChatBotsServices";
import CreateDialogChatBotsServices from "../DialogChatBotsServices/CreateDialogChatBotsServices";
import DeleteDialogChatBotsServices from "../DialogChatBotsServices/DeleteDialogChatBotsServices";
import ShowQueueService from "../QueueService/ShowQueueService";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import formatBody from "../../helpers/Mustache";
import SendWhatsAppMessage from "./SendWhatsAppMessage";
import { logger } from "../../utils/logger";

const isNumeric = (value: string) => /^-?\d+$/.test(value);

const pickOption = (
  options: Array<Chatbot | null> | undefined,
  selectedIndex: number
): Chatbot | undefined => {
  const validOptions = (options || []).filter(Boolean) as Chatbot[];
  return Number.isInteger(selectedIndex)
    ? validOptions[selectedIndex]
    : undefined;
};

const sendText = async (ticket: Ticket, body: string): Promise<void> => {
  await SendWhatsAppMessage({ body: formatBody(body, ticket), ticket });
};

const assignAgentIfPossible = async (node: Chatbot, ticket: Ticket) => {
  if (!node.queueId) return false;
  const queue = await ShowQueueService(node.queueId);
  const users = queue.users || [];
  if (!users.length) {
    logger.warn({ queueId: queue.id }, "Zapo chatbot queue has no assigned agents");
    return false;
  }
  const user = users.find(candidate => candidate.name === node.name) || users[0];
  await UpdateTicketService({
    ticketData: { userId: user.id, status: "open", queueId: queue.id },
    ticketId: ticket.id
  });
  return true;
};

const showNode = async (ticket: Ticket, node: Chatbot): Promise<void> => {
  const details = await ShowChatBotServices(node.id);
  const options = details.options || [];
  const optionsText = options
    .map((option, index) => `🔹 *${index + 1}* - ${option.name}`)
    .join("\n");
  const body = optionsText
    ? `\u200e${details.greetingMessage || ""}\n\n${optionsText}\n\n*#* *Para volver al menu principal*`
    : `\u200e${details.greetingMessage || ""}`;
  if (body.trim()) await sendText(ticket, body);
};

const backToMainMenu = async (ticket: Ticket, contact: Contact): Promise<void> => {
  const whatsapp = await ShowWhatsAppService(ticket.whatsappId);
  const options = (whatsapp.queues || [])
    .map((queue, index) => `🔹 *${index + 1}* - ${queue.name}`)
    .join("\n");
  await UpdateTicketService({
    ticketData: {
      queueId: null,
      userId: null,
      status: "pending",
      useIntegration: false,
      integrationId: null,
      typebotSessionId: null,
      typebotStatus: false
    },
    ticketId: ticket.id
  });
  await DeleteDialogChatBotsServices(contact.id);
  await sendText(ticket, `\u200e${whatsapp.greetingMessage || ""}\n\n${options}`);
};

const processNode = async (
  ticket: Ticket,
  contact: Contact,
  node: Chatbot
): Promise<void> => {
  const details = await ShowChatBotServices(node.id);
  const hasChildren = Boolean(details.options?.length);
  const assigned = node.isAgent ? await assignAgentIfPossible(node, ticket) : false;

  if (!hasChildren) {
    const ticketData: any = {};
    if (node.queueId) ticketData.queueId = node.queueId;
    if (node.isAgent) {
      ticketData.status = "open";
      if (!assigned) ticketData.userId = null;
    } else {
      ticketData.status = "pending";
      ticketData.userId = null;
    }
    if (Object.keys(ticketData).length) {
      await UpdateTicketService({ ticketData, ticketId: ticket.id });
    }
    await DeleteDialogChatBotsServices(contact.id);
    await ticket.update({ isBot: false });
    if (node.greetingMessage) await sendText(ticket, `\u200e${node.greetingMessage}`);
    return;
  }

  await DeleteDialogChatBotsServices(contact.id);
  await CreateDialogChatBotsServices({
    awaiting: 1,
    contactId: contact.id,
    chatbotId: node.id,
    queueId: details.queueId
  });
  await showNode(ticket, node);
};

/** Runs the same queue chatbot tree used by whatsapp-web.js, without a Chat object. */
export const sayZapoChatbot = async (
  queueId: number,
  ticket: Ticket,
  contact: Contact,
  body: string
): Promise<void> => {
  if (body === "#") {
    await backToMainMenu(ticket, contact);
    return;
  }

  const stage = await ShowDialogChatBotsServices(contact.id);
  if (!stage) {
    // Free-form messages are data entered by the customer, not an implicit
    // selection of the first submenu option.
    if (!isNumeric(body)) return;

    const queue = await ShowQueueService(queueId);
    const selected = pickOption(queue.chatbots, Number(body) - 1);
    if (!selected || !selected.greetingMessage) {
      return;
    }
    await processNode(ticket, contact, selected);
    return;
  }

  // Stay on the active submenu until an explicit numeric option arrives.
  if (!isNumeric(body)) return;

  const node = await ShowChatBotServices(stage.chatbotId);
  const selected = pickOption(node.options, Number(body) - 1);
  if (!selected || !selected.greetingMessage) {
    return;
  }
  await processNode(ticket, contact, selected);
};
