import { getIO } from "../libs/socket";
import Message from "../models/Message";
import Ticket from "../models/Ticket";
import { logger } from "../utils/logger";
import GetTicketWbot from "./GetTicketWbot";
import { getContactJid } from "./GetContactJid";
import Whatsapp from "../models/Whatsapp";
import { getWhaileys, whaileysJid } from "../libs/whaileys";
import { getZapo, resolveZapoRecipientJid } from "../libs/zapo";

const SetTicketMessagesAsRead = async (ticket: Ticket): Promise<void> => {
  await Message.update(
    { read: true },
    {
      where: {
        ticketId: ticket.id,
        read: false
      }
    }
  );

  await ticket.update({ unreadMessages: 0 });

  try {
    const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);
    if (!whatsapp) return;
    if (whatsapp?.provider === "whaileys") {
      const lastMessage = await Message.findOne({
        where: { ticketId: ticket.id },
        order: [["createdAt", "DESC"]]
      });
      if (lastMessage) {
        const remoteJid = whaileysJid(
          ticket.contact.number,
          ticket.isGroup,
          ticket.contact.remoteJid
        );
        await getWhaileys(whatsapp.id).readMessages([
          { remoteJid, id: lastMessage.id, fromMe: lastMessage.fromMe }
        ]);
      }
    } else if (whatsapp?.provider === "zapo") {
      // Zapo does not expose WhatsApp-Web.js' sendSeen. Send a standard
      // WhatsApp read receipt for the last inbound message instead.
      const lastInboundMessage = await Message.findOne({
        where: { ticketId: ticket.id, fromMe: false },
        order: [["createdAt", "DESC"]]
      });
      if (lastInboundMessage) {
        const remoteJid = await resolveZapoRecipientJid(
          whatsapp.id,
          ticket.contact.number,
          ticket.isGroup,
          ticket.contact.remoteJid
        );
        await getZapo(whatsapp.id).message.sendReceipt(
          remoteJid,
          lastInboundMessage.id,
          { type: "read" }
        );
      }
    } else {
      const wbot = await GetTicketWbot(ticket);
      await wbot.sendSeen(getContactJid(ticket.contact.number, ticket.isGroup));
    }
  } catch (err) {
    logger.warn(
      `Could not mark messages as read. Maybe whatsapp session disconnected? Err: ${err}`
    );
  }

  const io = getIO();
  io.to(ticket.status).to("notification").emit("ticket", {
    action: "updateUnread",
    ticketId: ticket.id
  });
};

export default SetTicketMessagesAsRead;
