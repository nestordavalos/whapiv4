import AppError from "../../errors/AppError";
import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import CreateMessageService from "../MessageServices/CreateMessageService";

const BLOCKED_ERROR = "ERR_WAPP_RECIPIENT_REQUIRES_CONTACT";
const normalizeAccount = (accountNumber?: string): string =>
  String(accountNumber || "").replace(/\D/g, "");

const emitTicketUpdate = (ticket: Ticket) => {
  getIO()
    .to(ticket.id.toString())
    .to(ticket.status)
    .emit("ticket", { action: "update", ticket });
};

const updateTickets = async (
  tickets: Ticket[],
  values: Partial<Ticket>
): Promise<void> => {
  await Promise.all(
    tickets.map(async ticket => {
      await ticket.update(values);
      emitTicketUpdate(ticket);
    })
  );
};

const ticketsForRecipient = (ticket: Ticket) =>
  Ticket.findAll({
    where: {
      whatsappId: ticket.whatsappId,
      contactId: ticket.contactId,
      isGroup: false
    }
  });

export const blockZapoRecipientSend = async (
  ticket: Ticket,
  accountNumber?: string
): Promise<void> => {
  if (ticket.isGroup) return;

  const tickets = await ticketsForRecipient(ticket);
  const blockedAt = new Date();
  await updateTickets(tickets, {
    zapoSendBlocked: true,
    zapoSendBlockedAt: blockedAt,
    zapoSendBlockedAccount: normalizeAccount(accountNumber) || null
  });

  await CreateMessageService({
    messageData: {
      id: `system-privacy-token-blocked-${ticket.id}`,
      ticketId: ticket.id,
      body: BLOCKED_ERROR,
      fromMe: false,
      read: true,
      mediaType: "system",
      ack: 1,
      createdAt: blockedAt,
      updatedAt: blockedAt
    }
  });
};

export const assertZapoRecipientCanReceive = async (
  ticket: Ticket,
  accountNumber?: string
): Promise<void> => {
  if (ticket.isGroup) return;

  const blockedTickets = await Ticket.findAll({
    where: {
      whatsappId: ticket.whatsappId,
      contactId: ticket.contactId,
      isGroup: false,
      zapoSendBlocked: true
    }
  });

  const currentAccount = normalizeAccount(accountNumber);
  const staleTickets = blockedTickets.filter(
    blockedTicket =>
      Boolean(currentAccount) &&
      Boolean(blockedTicket.zapoSendBlockedAccount) &&
      normalizeAccount(blockedTicket.zapoSendBlockedAccount) !== currentAccount
  );
  if (staleTickets.length > 0) {
    await updateTickets(staleTickets, {
      zapoSendBlocked: false,
      zapoSendBlockedAt: null,
      zapoSendBlockedAccount: null
    });
  }

  const blockedTicket = blockedTickets.find(
    item => !staleTickets.some(stale => stale.id === item.id)
  );
  if (!blockedTicket) return;

  if (!ticket.zapoSendBlocked) {
    await updateTickets([ticket], {
      zapoSendBlocked: true,
      zapoSendBlockedAt: blockedTicket.zapoSendBlockedAt,
      zapoSendBlockedAccount: blockedTicket.zapoSendBlockedAccount
    });
  }

  throw new AppError(BLOCKED_ERROR, 422);
};

/** Clears the restriction only after Zapo receives a trusted-contact token. */
export const unblockZapoRecipientByJid = async (
  whatsappId: number,
  remoteJid: string
): Promise<void> => {
  const contacts = await Contact.findAll({ where: { remoteJid } });
  if (contacts.length === 0) return;

  const tickets = await Ticket.findAll({
    where: {
      whatsappId,
      contactId: contacts.map(contact => contact.id),
      zapoSendBlocked: true
    }
  });
  if (tickets.length === 0) return;

  await updateTickets(tickets, {
    zapoSendBlocked: false,
    zapoSendBlockedAt: null,
    zapoSendBlockedAccount: null
  });
};

/** A WhatsApp row can be relinked to another account; clear old 463 state. */
export const clearZapoRecipientBlocksForAccountChange = async (
  whatsappId: number
): Promise<void> => {
  const tickets = await Ticket.findAll({
    where: { whatsappId, zapoSendBlocked: true }
  });
  if (tickets.length === 0) return;

  await updateTickets(tickets, {
    zapoSendBlocked: false,
    zapoSendBlockedAt: null,
    zapoSendBlockedAccount: null
  });
};
