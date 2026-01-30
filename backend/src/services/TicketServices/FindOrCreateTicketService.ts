import { subSeconds } from "date-fns";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";
import ListSettingsServiceOne from "../SettingServices/ListSettingsServiceOne";
import { sendTicketCreatedWebhook } from "../WebhookService/SendWebhookEvent";
import { logger } from "../../utils/logger";

interface FindOrCreateOptions {
  /** If true and no open ticket exists, create as closed (for synced read messages) */
  createAsClosed?: boolean;
}

const FindOrCreateTicketService = async (
  contact: Contact,
  whatsappId: number,
  unreadMessages: number,
  queueId?: number,
  tagsId?: number,
  userId?: number,
  groupContact?: Contact,
  options?: FindOrCreateOptions
): Promise<Ticket> => {
  const { createAsClosed = false } = options || {};

  logger.info(`[FindOrCreateTicket] Iniciando búsqueda - contactId: ${contact.id}, whatsappId: ${whatsappId}`);

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
    logger.info(`[FindOrCreateTicket] Encontrado ticket open/pending: ${ticket.id}, status: ${ticket.status}`);
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
      logger.info(`[FindOrCreateTicket] Encontrado ticket de grupo: ${ticket.id}, status: ${ticket.status}`);
      // NO actualizar tickets cerrados - ignorarlos y crear uno nuevo
      if (ticket.status === "closed") {
        logger.info(`[FindOrCreateTicket] Ticket ${ticket.id} está cerrado - se ignorará y creará uno nuevo`);
        ticket = null;
      } else {
        // Solo actualizar si el ticket está open o pending
        const updateData: any = {
          unreadMessages,
          isBot: true
        };

        if (ticket.status !== "open") {
          updateData.status = "pending";
          updateData.userId = null;
          updateData.queueId = null;
        }

        logger.info(`[FindOrCreateTicket] Actualizando ticket ${ticket.id} de grupo:`, updateData);
        await ticket.update(updateData);
      }
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
      logger.info(`[FindOrCreateTicket] Encontrado ticket reciente: ${ticket.id}, status: ${ticket.status}`);
      // NO actualizar tickets cerrados - ignorarlos y crear uno nuevo
      if (ticket.status === "closed") {
        logger.info(`[FindOrCreateTicket] Ticket ${ticket.id} está cerrado - se ignorará y creará uno nuevo`);
        ticket = null;
      } else {
        // Solo actualizar si el ticket está open o pending
        const updateData: any = {
          unreadMessages,
          isBot: true
        };

        if (ticket.status !== "open") {
          updateData.status = "pending";
          updateData.userId = null;
          updateData.queueId = null;
        }

        logger.info(`[FindOrCreateTicket] Actualizando ticket ${ticket.id}:`, updateData);
        await ticket.update(updateData);
      }
    }
  }

  if (!ticket) {
    // Determine initial status based on options
    const initialStatus = createAsClosed ? "closed" : "pending";
    logger.info(`[FindOrCreateTicket] Creando nuevo ticket con status: ${initialStatus}`);

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
        queueId: queueId || null,
        userId: userId || null
      });
    } catch (err) {
      logger.error("Error sending ticket_created webhook:", err);
    }
  }

  // Optimized: Single update instead of multiple separate updates
  const updateFields: Partial<Ticket> = {};

  if (queueId != 0 && queueId != undefined) {
    updateFields.queueId = queueId;
  }

  if (tagsId != 0 && tagsId != undefined) {
    (updateFields as any).tagsId = tagsId;
  }

  if (userId != 0 && userId != undefined) {
    updateFields.userId = userId;
  }

  if (Object.keys(updateFields).length > 0) {
    await ticket.update(updateFields);
  }

  ticket = await ShowTicketService(ticket.id);

  return ticket;
};

export default FindOrCreateTicketService;
