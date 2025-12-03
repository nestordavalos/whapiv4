import { Client, Message as WbotMessage } from "whatsapp-web.js";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import { verifyMessage } from "./wbotMessageListener";
import ShowDialogChatBotsServices from "../DialogChatBotsServices/ShowDialogChatBotsServices";
import ShowQueueService from "../QueueService/ShowQueueService";
import ShowChatBotServices from "../ChatBotServices/ShowChatBotServices";
import DeleteDialogChatBotsServices from "../DialogChatBotsServices/DeleteDialogChatBotsServices";
import ShowChatBotByChatbotIdServices from "../ChatBotServices/ShowChatBotByChatbotIdServices";
import CreateDialogChatBotsServices from "../DialogChatBotsServices/CreateDialogChatBotsServices";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import formatBody from "../../helpers/Mustache";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import Chatbot from "../../models/Chatbot";

type Session = Client & {
  id?: number;
};

const isNumeric = (value: string) => /^-?\d+$/.test(value);

const pickOption = (
  options: Array<Chatbot | null> | undefined,
  selectedIndex: number
): Chatbot | undefined => {
  if (!options || options.length === 0) {
    return undefined;
  }

  const validOptions = options.filter(Boolean) as Chatbot[];

  if (validOptions.length === 0) {
    return undefined;
  }

  if (!Number.isNaN(selectedIndex) && validOptions[selectedIndex]) {
    return validOptions[selectedIndex];
  }

  return validOptions[0];
};

const assignAgentIfPossible = async (
  node: Chatbot,
  ticket: Ticket
): Promise<boolean> => {
  if (!node.queueId) {
    console.warn(
      `[Chatbot] Cannot assign agent for ${node.name}: missing queueId`
    );
    return false;
  }

  const queue = await ShowQueueService(node.queueId);
  const queueUsers = queue.users || [];

  if (!queueUsers.length) {
    console.warn(
      `[Chatbot] Queue ${queue.name} has no agents with permission to receive tickets`
    );
    return false;
  }

  const user =
    queueUsers.find(qUser => qUser.name === node.name) || queueUsers[0];

  await UpdateTicketService({
    ticketData: {
      userId: user.id,
      status: "open",
      queueId: queue.id
    },
    ticketId: ticket.id
  });

  return true;
};

const hasChildOptions = (node?: Chatbot) =>
  !!node?.options && node.options.length > 0;

const buildLeafTicketUpdate = (node: Chatbot, agentAssigned: boolean) => {
  const ticketData: {
    status?: string;
    queueId?: number;
    userId?: number | null;
  } = {};

  if (node.queueId) {
    ticketData.queueId = node.queueId;
  }

  if (node.isAgent) {
    ticketData.status = "open";
    if (!agentAssigned) {
      ticketData.userId = null;
    }
  } else {
    ticketData.status = "pending";
    ticketData.userId = null;
  }

  return Object.keys(ticketData).length ? ticketData : undefined;
};

const finalizeChatbotFlow = async (
  node: Chatbot,
  wbot: Session,
  contact: Contact,
  ticket: Ticket
) => {
  await DeleteDialogChatBotsServices(contact.id);
  await ticket.update({ isBot: false });

  if (node.greetingMessage) {
    await sendMessage(wbot, contact, ticket, `\u200e${node.greetingMessage}`);
  }
};

export const deleteAndCreateDialogStage = async (
  contact: Contact,
  chatbotId: number,
  ticket: Ticket
) => {
  try {
    await DeleteDialogChatBotsServices(contact.id);
    const bots = await ShowChatBotByChatbotIdServices(chatbotId);
    if (!bots) {
      await ticket.update({ isBot: false });
    }
    return await CreateDialogChatBotsServices({
      awaiting: 1,
      contactId: contact.id,
      chatbotId,
      queueId: bots.queueId
    });
  } catch (error) {
    await ticket.update({ isBot: false });
  }
};

const sendMessage = async (
  wbot: Session,
  contact: Contact,
  ticket: Ticket,
  body: string
) => {
  const sentMessage = await wbot.sendMessage(
    `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
    formatBody(body, ticket)
  );
  verifyMessage(sentMessage, ticket, contact);
};

const sendDialog = async (
  choosenQueue: Chatbot,
  wbot: Session,
  contact: Contact,
  ticket: Ticket,
  nodeWithOptions?: Chatbot
) => {
  const showChatBots =
    nodeWithOptions || (await ShowChatBotServices(choosenQueue.id));
  if (showChatBots.options) {
    let options = "";

    showChatBots.options.forEach((option, index) => {
      options += `🔹 *${index + 1}* - ${option.name}\n`;
    });

    const optionsBack =
      options.length > 0
        ? `${options}\n*#* *Para volver al menu principal*`
        : options;

    if (options.length > 0) {
      const body = `\u200e${choosenQueue.greetingMessage}\n\n${optionsBack}`;
      const sendOption = await sendMessage(wbot, contact, ticket, body);
      return sendOption;
    }

    const body = `\u200e${choosenQueue.greetingMessage}`;
    const send = await sendMessage(wbot, contact, ticket, body);
    return send;
  }
};

const backToMainMenu = async (
  wbot: Session,
  contact: Contact,
  ticket: Ticket
) => {
  const { queues, greetingMessage } = await ShowWhatsAppService(wbot.id!);
  let options = "";

  queues.forEach((option, index) => {
    options += `🔹 *${index + 1}* - ${option.name}\n`;
  });

  const body = formatBody(`\u200e${greetingMessage}\n\n${options}`, ticket);
  await sendMessage(wbot, contact, ticket, body);

  await UpdateTicketService({
    ticketData: { queueId: null },
    ticketId: ticket.id
  });

  const deleteDialog = await DeleteDialogChatBotsServices(contact.id);
  return deleteDialog;
};

export const sayChatbot = async (
  queueId: number,
  wbot: Session,
  ticket: Ticket,
  contact: Contact,
  msg: WbotMessage
): Promise<any> => {
  const selectedOption = msg.body;
  if (!queueId && selectedOption && msg.fromMe) return;

  const getStageBot = await ShowDialogChatBotsServices(contact.id);

  if (selectedOption === "#") {
    const backTo = await backToMainMenu(wbot, contact, ticket);
    return backTo;
  }

  if (!getStageBot) {
    const queue = await ShowQueueService(queueId);
    const optionIndex = Number(selectedOption) - 1;
    const choosenQueue = pickOption(queue.chatbots, optionIndex);

    if (!choosenQueue) {
      await backToMainMenu(wbot, contact, ticket);
      return;
    }
    if (!choosenQueue?.greetingMessage) {
      await DeleteDialogChatBotsServices(contact.id);
      return;
    } // nao tem mensagem de boas vindas

    if (choosenQueue) {
      const nodeDetails = await ShowChatBotServices(choosenQueue.id);
      const childrenAvailable = hasChildOptions(nodeDetails);
      const agentAssigned = choosenQueue.isAgent
        ? await assignAgentIfPossible(choosenQueue, ticket)
        : false;

      if (!childrenAvailable) {
        const ticketUpdate = buildLeafTicketUpdate(choosenQueue, agentAssigned);

        if (ticketUpdate) {
          await UpdateTicketService({
            ticketData: ticketUpdate,
            ticketId: ticket.id
          });
        }

        await finalizeChatbotFlow(choosenQueue, wbot, contact, ticket);
        return;
      }

      await deleteAndCreateDialogStage(contact, choosenQueue.id, ticket);
      const send = await sendDialog(
        choosenQueue,
        wbot,
        contact,
        ticket,
        nodeDetails
      );
      return send;
    }
  }

  if (getStageBot) {
    const selected = isNumeric(selectedOption) ? selectedOption : 1;
    const bots = await ShowChatBotServices(getStageBot.chatbotId);
    const optionIndex = Number(selected) - 1;
    const choosenQueue = pickOption(bots.options, optionIndex);

    if (!choosenQueue) {
      await DeleteDialogChatBotsServices(contact.id);
      await backToMainMenu(wbot, contact, ticket);
      return;
    }
    if (!choosenQueue.greetingMessage) {
      await DeleteDialogChatBotsServices(contact.id);
      return;
    } // nao tem mensagem de boas vindas

    if (choosenQueue) {
      const nodeDetails = await ShowChatBotServices(choosenQueue.id);
      const childrenAvailable = hasChildOptions(nodeDetails);
      const agentAssigned = choosenQueue.isAgent
        ? await assignAgentIfPossible(choosenQueue, ticket)
        : false;

      if (!childrenAvailable) {
        const ticketUpdate = buildLeafTicketUpdate(choosenQueue, agentAssigned);

        if (ticketUpdate) {
          await UpdateTicketService({
            ticketData: ticketUpdate,
            ticketId: ticket.id
          });
        }

        await finalizeChatbotFlow(choosenQueue, wbot, contact, ticket);
        return;
      }

      await deleteAndCreateDialogStage(contact, choosenQueue.id, ticket);
      const send = await sendDialog(
        choosenQueue,
        wbot,
        contact,
        ticket,
        nodeDetails
      );
      return send;
    }
  }
  console.log();
};
