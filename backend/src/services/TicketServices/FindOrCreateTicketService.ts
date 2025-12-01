import { subSeconds } from "date-fns";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";
import ListSettingsServiceOne from "../SettingServices/ListSettingsServiceOne";

const FindOrCreateTicketService = async (
  contact: Contact,
  whatsappId: number,
  unreadMessages: number,
  queueId?: number,
  tagsId?: number,
  userId?: number,
  groupContact?: Contact
): Promise<Ticket> => {
  let ticket = await Ticket.findOne({
    where: {
      status: {
        [Op.or]: ["open", "pending"]
      },
      contactId: groupContact ? groupContact.id : contact.id,
      whatsappId
    }
  });

  if (ticket) {
    await ticket.update({ unreadMessages });
  }

  if (!ticket && groupContact) {
    ticket = await Ticket.findOne({
      where: {
        contactId: groupContact.id,
        whatsappId
      },
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages,
        isBot: true
      });
    }
  }

  if (!ticket && !groupContact) {
    const listSettingsService = await ListSettingsServiceOne({
      key: "timeCreateNewTicket"
    });
    const timeCreateNewTicket = listSettingsService?.value;

    ticket = await Ticket.findOne({
      where: {
        updatedAt: {
          [Op.between]: [
            +subSeconds(new Date(), Number(timeCreateNewTicket)),
            +new Date()
          ]
        },
        contactId: contact.id,
        whatsappId
      },
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages,
        isBot: true
      });
    }
  }

  if (!ticket) {
    ticket = await Ticket.create({
      contactId: groupContact ? groupContact.id : contact.id,
      status: "pending",
      isGroup: !!groupContact,
      isBot: true,
      unreadMessages,
      whatsappId
    });
  }

  if (queueId != 0 && queueId != undefined) {
    // Determina qual a fila esse ticket pertence.
    await ticket.update({ queueId });
  }

  if (tagsId != 0 && tagsId != undefined) {
    // Determina qual a fila esse ticket pertence.
    await ticket.update({ tagsId });
  }

  if (userId != 0 && userId != undefined) {
    // Determina qual a fila esse ticket pertence.
    await ticket.update({ userId });
  }

  ticket = await ShowTicketService(ticket.id);

  return ticket;
};

export default FindOrCreateTicketService;
