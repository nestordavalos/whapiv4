import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import { getWbot } from "../../libs/wbot";
import { getZapoStoredContact } from "../../libs/zapo";
import { isLikelyLid, resolvePhoneFromLid } from "../../helpers/GetContactJid";
import { logger } from "../../utils/logger";
import { getIO } from "../../libs/socket";

interface FixResult {
  totalLidContacts: number;
  resolved: number;
  failed: number;
  merged: number;
  details: Array<{
    contactId: number;
    oldNumber: string;
    newNumber: string | null;
    status: "resolved" | "failed" | "merged";
    error?: string;
  }>;
}

/**
 * Scans the database for contacts whose `number` field looks like a WhatsApp LID
 * (>15 digits) and attempts to resolve each one to a real phone number using
 * the active WhatsApp session.
 *
 * If the resolved phone number already exists as another contact, the LID
 * contact's tickets are reassigned and the LID contact is deleted (merged).
 */
const FixLidContactsService = async (
  whatsappId?: number
): Promise<FixResult> => {
  const result: FixResult = {
    totalLidContacts: 0,
    resolved: 0,
    failed: 0,
    merged: 0,
    details: []
  };

  // Find an active WhatsApp session
  let wbot: any;
  let activeWhatsapp: Whatsapp | null = null;
  try {
    if (whatsappId) {
      activeWhatsapp = await Whatsapp.findByPk(whatsappId);
      if (!activeWhatsapp) throw new Error("WhatsApp connection not found");
      if (activeWhatsapp.provider !== "zapo") wbot = getWbot(whatsappId);
    } else {
      // Find any connected WhatsApp
      const whatsapp = await Whatsapp.findOne({
        where: { status: "CONNECTED" }
      });
      if (!whatsapp) {
        throw new Error("No active WhatsApp connection found");
      }
      activeWhatsapp = whatsapp;
      if (whatsapp.provider !== "zapo") wbot = getWbot(whatsapp.id);
    }
  } catch (err: any) {
    throw new Error(`Cannot get WhatsApp session: ${err.message}`);
  }

  // Find all contacts that look like LID numbers (not groups)
  const allContacts = await Contact.findAll({
    where: {
      isGroup: false,
      number: { [Op.ne]: "" }
    }
  });

  const lidContacts = allContacts.filter(c => isLikelyLid(c.number));
  result.totalLidContacts = lidContacts.length;

  if (lidContacts.length === 0) {
    logger.info("[FixLidContacts] No LID contacts found in database");
    return result;
  }

  logger.info(
    `[FixLidContacts] Found ${lidContacts.length} contacts with LID numbers, resolving...`
  );

  const io = getIO();

  for (const contact of lidContacts) {
    try {
      const zapoContact =
        activeWhatsapp?.provider === "zapo"
          ? await getZapoStoredContact(activeWhatsapp.id, contact.number)
          : null;
      const resolvedPhone = zapoContact?.phoneNumber
        ? zapoContact.phoneNumber.split("@")[0]
        : activeWhatsapp?.provider === "zapo"
        ? null
        : await resolvePhoneFromLid(wbot, contact.number);

      if (!resolvedPhone) {
        result.failed++;
        result.details.push({
          contactId: contact.id,
          oldNumber: contact.number,
          newNumber: null,
          status: "failed",
          error: "Could not resolve phone from LID"
        });
        continue;
      }

      // Check if a contact with the resolved phone number already exists
      const existingContact = await Contact.findOne({
        where: {
          number: resolvedPhone,
          id: { [Op.ne]: contact.id }
        }
      });

      if (existingContact) {
        // Merge: reassign tickets from LID contact to the existing contact
        logger.info(
          `[FixLidContacts] Merging LID contact ${contact.id} (${contact.number}) ` +
            `into existing contact ${existingContact.id} (${existingContact.number})`
        );

        // Import Ticket model dynamically to avoid circular dependencies
        const Ticket = (await import("../../models/Ticket")).default;

        await Ticket.update(
          { contactId: existingContact.id },
          { where: { contactId: contact.id } }
        );

        // Delete the LID contact
        await contact.destroy();

        result.merged++;
        result.details.push({
          contactId: contact.id,
          oldNumber: contact.number,
          newNumber: resolvedPhone,
          status: "merged"
        });

        io.emit("contact", {
          action: "delete",
          contactId: contact.id
        });

        io.emit("contact", {
          action: "update",
          contact: existingContact
        });
      } else {
        // Update the contact number to the real phone number
        logger.info(
          `[FixLidContacts] Updating contact ${contact.id}: ${contact.number} → ${resolvedPhone}`
        );

        await contact.update({
          number: resolvedPhone,
          name: contact.name === contact.number ? resolvedPhone : contact.name
        });

        result.resolved++;
        result.details.push({
          contactId: contact.id,
          oldNumber: contact.number,
          newNumber: resolvedPhone,
          status: "resolved"
        });

        io.emit("contact", {
          action: "update",
          contact
        });
      }

      // Small delay to avoid overwhelming the WhatsApp session
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err: any) {
      logger.error(
        `[FixLidContacts] Error processing contact ${contact.id} (${contact.number}): ${err.message}`
      );
      result.failed++;
      result.details.push({
        contactId: contact.id,
        oldNumber: contact.number,
        newNumber: null,
        status: "failed",
        error: err.message
      });
    }
  }

  logger.info(
    `[FixLidContacts] Complete: ${result.resolved} resolved, ${result.merged} merged, ${result.failed} failed out of ${result.totalLidContacts}`
  );

  return result;
};

export default FixLidContactsService;
