import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import { getZapoStoredContacts } from "../../libs/zapo";
import Contact from "../../models/Contact";
import { logger } from "../../utils/logger";

const ImportContactsService = async (userId: number): Promise<void> => {
  const defaultWhatsapp = await GetDefaultWhatsApp(userId);

  if (defaultWhatsapp.provider === "zapo") {
    const storedContacts = await getZapoStoredContacts(defaultWhatsapp.id);
    await Promise.all(
      storedContacts.map(async contact => {
        const number = (contact.phoneNumber || contact.jid || "")
          .split("@")[0]
          .replace(/\D/g, "");
        if (!number) return null;
        const name = contact.displayName || contact.pushName || number;
        const numberExists = await Contact.findOne({ where: { number } });
        if (numberExists) return null;
        return Contact.create({ number, name });
      })
    );
    return;
  }

  const wbot = getWbot(defaultWhatsapp.id);

  let phoneContacts;

  try {
    phoneContacts = await wbot.getContacts();
  } catch (err) {
    logger.error(`Could not get whatsapp contacts from phone. Err: ${err}`);
  }

  if (phoneContacts) {
    await Promise.all(
      phoneContacts.map(async ({ number, name }) => {
        if (!number) {
          return null;
        }
        if (!name) {
          name = number;
        }

        const numberExists = await Contact.findOne({
          where: { number }
        });

        if (numberExists) return null;

        return Contact.create({ number, name });
      })
    );
  }
};

export default ImportContactsService;
