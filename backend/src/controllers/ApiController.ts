import { Request, Response } from "express";
import * as Yup from "yup";
import AppError from "../errors/AppError";
import GetDefaultWhatsApp from "../helpers/GetDefaultWhatsApp";
import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";
import Whatsapp from "../models/Whatsapp";
import CreateOrUpdateContactService from "../services/ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import CheckIsValidContact from "../services/WbotServices/CheckIsValidContact";
import CheckContactNumber from "../services/WbotServices/CheckNumber";
import GetProfilePicUrl from "../services/WbotServices/GetProfilePicUrl";
import SendWhatsAppMedia from "../services/WbotServices/SendWhatsAppMedia";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import ListSettingsServiceOne from "../services/SettingServices/ListSettingsServiceOne";
import ListQueuesService from "../services/QueueService/ListQueuesService";

type UserData = {
  userId: number;
};

type TagData = {
  tagsId: number;
};

type QueueData = {
  queueId: number;
};

type WhatsappData = {
  whatsappId: number;
};

interface ContactData {
  number: string;
}

const createContact = async (
  userId: number | 0,
  tagsId: number | 0,
  queueId: number | 0,
  whatsappId: number | undefined,
  newContact: string
) => {
  let whatsapp: Whatsapp | null;

  if (whatsappId === undefined) {
    whatsapp = await GetDefaultWhatsApp();
  } else {
    whatsapp = await Whatsapp.findByPk(whatsappId);

    if (whatsapp === null) {
      throw new AppError(`whatsapp #${whatsappId} not found`);
    }
  }

  // Validation and profile lookup must use the requested connection. Falling
  // back to the default session made /api/send fail or query the wrong
  // provider whenever whatsappId pointed to a Zapo inbox.
  await CheckIsValidContact(newContact, whatsapp.id);
  const number = await CheckContactNumber(newContact, whatsapp.id);
  const profilePicUrl = await GetProfilePicUrl(number, whatsapp.id);
  const contact = await CreateOrUpdateContactService({
    name: `${number}`,
    number,
    profilePicUrl,
    isGroup: false,
    whatsappId: whatsapp.id
  });

  const createTicket = await FindOrCreateTicketService(
    contact,
    whatsapp.id,
    1,
    queueId,
    tagsId,
    userId
  );

  const ticket = await ShowTicketService(createTicket.id);

  SetTicketMessagesAsRead(ticket);

  return ticket;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const newContact: ContactData = req.body;
  const { whatsappId }: WhatsappData = req.body;
  const { queueId }: QueueData = req.body;
  const { tagsId }: TagData = req.body;
  const { userId }: UserData = req.body;
  const { body } = req.body;
  const quotedMsg = req.body.quotedMsg
    ? typeof req.body.quotedMsg === "string"
      ? JSON.parse(req.body.quotedMsg)
      : req.body.quotedMsg
    : undefined;
  const medias = req.files as Express.Multer.File[] | undefined;

  newContact.number =
    typeof newContact.number === "string"
      ? newContact.number.replace("-", "").replace(" ", "")
      : newContact.number;

  const schema = Yup.object().shape({
    number: Yup.string()
      .nullable()
      .required("Number is required")
      .matches(/^\d+$/, "Invalid number format. Only numbers is allowed.")
  });

  try {
    await schema.validate(newContact);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const contactAndTicket = await createContact(
    userId,
    tagsId,
    queueId,
    whatsappId,
    newContact.number
  );

  let resp: any;

  if (medias && medias.length > 0) {
    await Promise.all(
      medias.map(async (media: Express.Multer.File) => {
        resp = await SendWhatsAppMedia({
          body,
          media,
          ticket: contactAndTicket,
          quotedMsg
        });
      })
    );
  } else {
    resp = await SendWhatsAppMessage({
      body,
      ticket: contactAndTicket,
      quotedMsg
    });
  }

  const listSettingsService = await ListSettingsServiceOne({
    key: "closeTicketApi"
  });
  const closeTicketApi = listSettingsService?.value;

  if (closeTicketApi === "enabled") {
    setTimeout(async () => {
      await UpdateTicketService({
        ticketId: contactAndTicket.id,
        ticketData: { status: "closed" }
      });
    }, 1000);
  }
  return res.send({ error: resp });
};

export const list = async (req: Request, res: Response): Promise<Response> => {
  const queues = await ListQueuesService();
  return res.status(200).json(queues);
};
