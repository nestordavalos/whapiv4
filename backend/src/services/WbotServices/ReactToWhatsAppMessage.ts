import AppError from "../../errors/AppError";
import { getZapo, zapoJid } from "../../libs/zapo";
import Message from "../../models/Message";
import Whatsapp from "../../models/Whatsapp";
import HandleMessageReactionService from "../MessageServices/HandleMessageReactionService";

interface Request {
  messageId: string;
  emoji: string;
}

const ReactToWhatsAppMessage = async ({
  messageId,
  emoji
}: Request): Promise<void> => {
  const message = await Message.findByPk(messageId, {
    include: ["ticket"]
  });
  if (!message?.ticket) throw new AppError("ERR_NO_MESSAGE_FOUND", 404);

  const whatsapp = await Whatsapp.findByPk(message.ticket.whatsappId);
  if (!whatsapp) throw new AppError("ERR_NO_WAPP_FOUND", 404);
  if (whatsapp.provider !== "zapo") {
    throw new AppError("ERR_WAPP_REACTION_UNSUPPORTED", 400);
  }

  const ticket = message.ticket as any;
  const contact = await ticket.getContact();
  const remoteJid = zapoJid(contact.number, ticket.isGroup, contact.remoteJid);
  await getZapo(whatsapp.id).message.send(remoteJid, {
    type: "reaction",
    emoji,
    target: {
      id: message.id,
      remoteJid,
      fromMe: message.fromMe
    }
  });

  await HandleMessageReactionService({
    reactionData: {
      messageId: message.id,
      emoji,
      senderId: `${whatsapp.number}@s.whatsapp.net`,
      senderName: whatsapp.name,
      fromMe: true
    }
  });
};

export default ReactToWhatsAppMessage;
