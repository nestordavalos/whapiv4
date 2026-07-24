import { subSeconds } from "date-fns";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";
import ListSettingsServiceOne from "../SettingServices/ListSettingsServiceOne";
import { sendTicketCreatedWebhook } from "../WebhookService/SendWebhookEvent";
import { logger } from "../../utils/logger";
import normalizeOptionalId from "../../helpers/NormalizeOptionalId";

interface FindOrCreateOptions {
  /** If true and no open ticket exists, create as closed (for synced read messages) */
  createAsClosed?: boolean;
  /**
   * Reuse the recipient's latest ticket regardless of its age or status.
   * Direct API sends use this to avoid creating one ticket per API retry.
   */
  reuseLatestTicket?: boolean;
}

const FindOrCreateTicketService = async (
  contact: Contact,
  whatsappId: number,
  unreadMessages: number,
  queueId?: number | string | null,
  tagsId?: number | string | null,
  userId?: number | string | null,
  groupContact?: Contact,
  options?: FindOrCreateOptions
): Promise<Ticket> => {
  const { createAsClosed = false, reuseLatestTicket = false } = options || {};
  const normalizedQueueId = normalizeOptionalId(queueId);
  const normalizedTagsId = normalizeOptionalId(tagsId);
  const normalizedUserId = normalizeOptionalId(userId);

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
      // Solo actualizar a pending si el ticket NO está open
      // Si está open, mantener ese estado para no interrumpir conversaciones activas
      const updateData: any = {
        unreadMessages,
        isBot: true
      };

      if (ticket.status !== "open") {
        updateData.status = "pending";
        updateData.userId = null;
        updateData.queueId = null;
      }

      await ticket.update(updateData);
    }
  }

  if (!ticket && !groupContact && reuseLatestTicket) {
    ticket = await Ticket.findOne({
      where: {
        contactId: contact.id,
        whatsappId
      },
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      const updateData: any = {
        unreadMessages,
        isBot: true
      };

      if (ticket.status !== "open") {
        updateData.status = "pending";
        updateData.userId = null;
        updateData.queueId = null;
      }

      await ticket.update(updateData);
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
      // Solo actualizar a pending si el ticket NO está open
      // Si está open, mantener ese estado para no interrumpir conversaciones activas
      const updateData: any = {
        unreadMessages,
        isBot: true
      };

      if (ticket.status !== "open") {
        updateData.status = "pending";
        updateData.userId = null;
        updateData.queueId = null;
      }

      await ticket.update(updateData);
    }
  }

  if (!ticket) {
    // Determine initial status based on options
    const initialStatus = createAsClosed ? "closed" : "pending";

    ticket = await Ticket.create({
      contactId: groupContact ? groupContact.id : contact.id,
      status: initialStatus,
      isGroup: !!groupContact,
      isBot: true,
      unreadMessages,
      whatsappId
    });

    // Enviar webhook de ticket creado
    try {
      await sendTicketCreatedWebhook(whatsappId, {
        ticketId: ticket.id,
        contactId: ticket.contactId,
        contactNumber: contact.number,
        contactName: contact.name,
        status: ticket.status,
        isGroup: ticket.isGroup,
        isBot: ticket.isBot,
        unreadMessages: ticket.unreadMessages,
        createdAt: ticket.createdAt,
        queueId: normalizedQueueId || null,
        userId: normalizedUserId || null
      });
    } catch (err) {
      logger.error("Error sending ticket_created webhook:", err);
    }
  }

  // Optimized: Single update instead of multiple separate updates
  const updateFields: Partial<Ticket> = {};

  if (normalizedQueueId) {
    updateFields.queueId = normalizedQueueId;
  }

  if (normalizedTagsId) {
    (updateFields as any).tagsId = normalizedTagsId;
  }

  if (normalizedUserId) {
    updateFields.userId = normalizedUserId;
  }

  if (Object.keys(updateFields).length > 0) {
    await ticket.update(updateFields);
  }

  ticket = await ShowTicketService(ticket.id);

  return ticket;
};

export default FindOrCreateTicketService;
