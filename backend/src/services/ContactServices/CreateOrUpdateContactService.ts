import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import {
  sendContactCreatedWebhook,
  sendContactUpdatedWebhook
} from "../WebhookService/SendWebhookEvent";
import { logger } from "../../utils/logger";

interface ExtraInfo {
  name: string;
  value: string;
}

interface Request {
  name: string;
  number: string;
  isGroup: boolean;
  email?: string;
  profilePicUrl?: string;
  extraInfo?: ExtraInfo[];
  whatsappId?: number;
}

const CreateOrUpdateContactService = async ({
  name,
  number: rawNumber,
  profilePicUrl,
  isGroup,
  email = "",
  extraInfo = [],
  whatsappId
}: Request): Promise<Contact> => {
  const number = isGroup ? rawNumber : rawNumber.replace(/[^0-9]/g, "");

  const io = getIO();
  let contact: Contact | null;

  contact = await Contact.findOne({ where: { number } });

  if (contact) {
    // Don't overwrite a real avatar URL with the default placeholder
    const isDefaultPic = profilePicUrl === "/default-profile.png";
    const hasRealPic =
      contact.profilePicUrl && contact.profilePicUrl !== "/default-profile.png";
    const updatePic =
      isDefaultPic && hasRealPic ? contact.profilePicUrl : profilePicUrl;

    if (updatePic !== undefined && updatePic !== contact.profilePicUrl) {
      await contact.update({ profilePicUrl: updatePic });

      io.emit("contact", {
        action: "update",
        contact
      });

      // Enviar webhook de contacto actualizado
      if (whatsappId) {
        try {
          await sendContactUpdatedWebhook(whatsappId, {
            contactId: contact.id,
            name: contact.name,
            number: contact.number,
            email: contact.email,
            isGroup: contact.isGroup,
            profilePicUrl: contact.profilePicUrl,
            updatedAt: new Date(),
            changes: {
              profilePicUrl: true
            }
          });
        } catch (err) {
          logger.error("Error sending contact_updated webhook:", err);
        }
      }
    }
  } else {
    contact = await Contact.create({
      name,
      number,
      profilePicUrl,
      email,
      isGroup,
      extraInfo
    });

    io.emit("contact", {
      action: "create",
      contact
    });

    // Enviar webhook de contacto creado
    if (whatsappId) {
      try {
        await sendContactCreatedWebhook(whatsappId, {
          contactId: contact.id,
          name: contact.name,
          number: contact.number,
          email: contact.email,
          isGroup: contact.isGroup,
          profilePicUrl: contact.profilePicUrl,
          createdAt: contact.createdAt,
          extraInfo: contact.extraInfo
        });
      } catch (err) {
        logger.error("Error sending contact_created webhook:", err);
      }
    }
  }

  return contact;
};

export default CreateOrUpdateContactService;
