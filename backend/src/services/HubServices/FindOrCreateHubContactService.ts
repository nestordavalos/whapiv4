import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";

export interface HubContact {
  name: string;
  number: string;
  firstName: string;
  lastName: string;
  picture: string;
  from: string;
  group: {
    id: string;
    name: string;
  };
  isGroup?: boolean;
  whatsapp?: Whatsapp;
  channel: string;
}

const FindOrCreateContactService = async (
  contact: HubContact
): Promise<Contact> => {
  const { name, number, picture, firstName, lastName, from, group, channel } =
    contact;

  const io = getIO();

  let messengerId;
  let instagramId;
  let telegramId;
  let email;
  let webchatId;
  let contactExists: Contact | null;
  let groupContact: Contact | null = null;

  if (channel === "email") {
    email = from;
    contactExists = await Contact.findOne({ where: { email: from } });
  } else if (channel === "telegram") {
    telegramId = from;
    contactExists = await Contact.findOne({ where: { telegramId: from } });

    if (group.id) {
      groupContact = await Contact.findOne({ where: { telegramId: group.id } });
    }
  } else if (channel === "facebook") {
    messengerId = from;
    contactExists = await Contact.findOne({ where: { messengerId: from } });
  } else if (channel === "instagram") {
    instagramId = from;
    contactExists = await Contact.findOne({ where: { instagramId: from } });
  } else if (channel === "webchat") {
    webchatId = from;
    contactExists = await Contact.findOne({ where: { webchatId: from } });
  } else {
    contactExists = null;
  }

  if (group.id && channel === "telegram") {
    if (groupContact) {
      await groupContact.update({
        name: group.name,
        telegramId: group.id,
        isGroup: true,
        profilePicUrl: picture
      });
      io.emit("contact", { action: "update", contact: groupContact });
    } else {
      groupContact = await Contact.create({
        name: group.name,
        telegramId: group.id,
        isGroup: true,
        profilePicUrl: picture
      });

      io.emit("contact", { action: "create", contact: groupContact });
    }
  }

  if (contactExists) {
    await contactExists.update({
      name: name || firstName || "Name Unavailable",
      number: channel === "webchat" ? number : null,
      firstName,
      lastName,
      isGroup: false,
      profilePicUrl: picture
    });
    io.emit("contact", { action: "update", contact: contactExists });
    return contactExists;
  }

  const newContact = await Contact.create({
    name: name || firstName || "Name Unavailable",
    number: channel === "webchat" ? number : null,
    profilePicUrl: picture,
    isGroup: false,
    messengerId: messengerId || null,
    instagramId: instagramId || null,
    telegramId: telegramId || null,
    webchatId: webchatId || null,
    email: email || null
  });

  io.emit("contact", { action: "create", contact: newContact });

  return newContact;
};

export default FindOrCreateContactService;
