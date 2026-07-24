import AppError from "../../errors/AppError";
import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import CreateMessageService from "../MessageServices/CreateMessageService";

const BLOCKED_ERROR = "ERR_WAPP_RECIPIENT_REQUIRES_CONTACT";

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

export const blockZapoRecipientSend = async (ticket: Ticket): Promise<void> => {
  if (ticket.isGroup) return;

  const tickets = await ticketsForRecipient(ticket);
  const blockedAt = new Date();
  await updateTickets(tickets, {
    zapoSendBlocked: true,
    zapoSendBlockedAt: blockedAt
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
  ticket: Ticket
): Promise<void> => {
  if (ticket.isGroup) return;

  const blockedTicket = await Ticket.findOne({
    where: {
      whatsappId: ticket.whatsappId,
      contactId: ticket.contactId,
      isGroup: false,
      zapoSendBlocked: true
    }
  });

  if (!blockedTicket) return;

  if (!ticket.zapoSendBlocked) {
    await updateTickets([ticket], {
      zapoSendBlocked: true,
      zapoSendBlockedAt: blockedTicket.zapoSendBlockedAt
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
    zapoSendBlockedAt: null
  });
};
