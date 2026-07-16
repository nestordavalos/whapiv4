import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import ListContactsService from "../services/ContactServices/ListContactsService";
import CreateContactService from "../services/ContactServices/CreateContactService";
import ShowContactService from "../services/ContactServices/ShowContactService";
import UpdateContactService from "../services/ContactServices/UpdateContactService";
import DeleteContactService from "../services/ContactServices/DeleteContactService";
import DeleteAllContactService from "../services/ContactServices/DeleteAllContactService";
import FixLidContactsService from "../services/ContactServices/FixLidContactsService";

import CheckContactNumber from "../services/WbotServices/CheckNumber";
import CheckIsValidContact from "../services/WbotServices/CheckIsValidContact";
import GetProfilePicUrl from "../services/WbotServices/GetProfilePicUrl";
import AppError from "../errors/AppError";
import GetContactService from "../services/ContactServices/GetContactService";
import Ticket from "../models/Ticket";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
};

type IndexGetContactQuery = {
  name: string;
  number: string;
  email: string;
};

interface ExtraInfo {
  name: string;
  value: string;
}
interface ContactData {
  name: string;
  number: string;
  email?: string;
  extraInfo?: ExtraInfo[];
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;

  const { contacts, count, hasMore } = await ListContactsService({
    searchParam,
    pageNumber
  });

  return res.json({ contacts, count, hasMore });
};

export const getContact = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { name, number, email } = req.body as IndexGetContactQuery;

  const contact = await GetContactService({
    name,
    number,
    email
  });

  return res.status(200).json(contact);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const newContact: ContactData = req.body;
  newContact.number =
    typeof newContact.number === "string"
      ? newContact.number
          .replace("-", "")
          .replace(" ", "")
          .replace("(", "")
          .replace(")", "")
          .replace("+", "")
          .replace(".", "")
          .replace("_", "")
      : newContact.number;

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    number: Yup.string()
      .nullable()
      .required("Number is required")
      .matches(/^\d+$/, "Invalid number format. Only numbers is allowed.")
  });

  try {
    await schema.validate(newContact);
  } catch (err) {
    throw new AppError(err.message);
  }

  await CheckIsValidContact(newContact.number);
  const validNumber: any = await CheckContactNumber(newContact.number);

  const profilePicUrl = await GetProfilePicUrl(validNumber);

  const { name } = newContact;
  const number = validNumber;
  const { email } = newContact;
  const { extraInfo } = newContact;

  const contact = await CreateContactService({
    name,
    number,
    email,
    extraInfo,
    profilePicUrl
  });

  const io = getIO();
  io.emit("contact", {
    action: "create",
    contact
  });

  return res.status(200).json(contact);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { contactId } = req.params;
  const contact = await ShowContactService(contactId);
  const ticket = await Ticket.findOne({
    where: { contactId: contact.id },
    order: [["updatedAt", "DESC"]]
  });
  if (ticket) {
    try {
      const profilePicUrl = await GetProfilePicUrl(
        contact.remoteJid || contact.number,
        ticket.whatsappId
      );
      if (
        profilePicUrl !== "/default-profile.png" &&
        profilePicUrl !== contact.profilePicUrl
      ) {
        await contact.update({ profilePicUrl });
      }
    } catch {
      // The avatar is optional; the contact itself must still load normally.
    }
  }
  return res.status(200).json(contact);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const contactData: ContactData = req.body;

  const schema = Yup.object().shape({
    name: Yup.string(),
    number: Yup.string().matches(
      /^\d+$/,
      "Invalid number format. Only numbers is allowed."
    )
  });

  try {
    await schema.validate(contactData);
  } catch (err) {
    throw new AppError(err.message);
  }

  await CheckIsValidContact(contactData.number);

  const { contactId } = req.params;

  const contact = await UpdateContactService({ contactData, contactId });

  const io = getIO();
  io.emit("contact", {
    action: "update",
    contact
  });

  return res.status(200).json(contact);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { contactId } = req.params;

  await DeleteContactService(contactId);

  const io = getIO();
  io.emit("contact", {
    action: "delete",
    contactId
  });

  return res.status(200).json({ message: "Contact deleted" });
};

export const removeAll = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await DeleteAllContactService();

  return res.send();
};

/**
 * POST /contacts/fix-lid
 * Scans all contacts in the database that have LID numbers (>15 digits)
 * and attempts to resolve them to real phone numbers using the active
 * WhatsApp session.
 *
 * Optional body: { whatsappId: number }
 */
export const fixLidContacts = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { whatsappId } = req.body || {};
    const result = await FixLidContactsService(whatsappId);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};
