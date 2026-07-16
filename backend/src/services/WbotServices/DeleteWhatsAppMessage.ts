import AppError from "../../errors/AppError";
import GetWbotMessage from "../../helpers/GetWbotMessage";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import { getWhaileys, whaileysJid } from "../../libs/whaileys";

const DeleteWhatsAppMessage = async (messageId: string): Promise<Message> => {
  const message = await Message.findByPk(messageId, {
    include: [
      {
        model: Ticket,
        as: "ticket",
        include: ["contact"]
      }
    ]
  });

  if (!message) {
    throw new AppError("No message found with this ID.");
  }

  const { ticket } = message;

  const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);
  if (whatsapp?.provider === "whaileys") {
    try {
      const remoteJid = whaileysJid(
        ticket.contact.number,
        ticket.isGroup,
        ticket.contact.remoteJid
      );
      await getWhaileys(whatsapp.id).sendMessage(remoteJid, {
        delete: { remoteJid, fromMe: message.fromMe, id: message.id }
      });
      await message.update({ isDeleted: true });
      return message;
    } catch (err) {
      throw new AppError("ERR_DELETE_WAPP_MSG");
    }
  }

  const messageToDelete = await GetWbotMessage(ticket, messageId);

  try {
    await messageToDelete.delete(true);
  } catch (err) {
    throw new AppError("ERR_DELETE_WAPP_MSG");
  }

  await message.update({ isDeleted: true });

  return message;
};

export default DeleteWhatsAppMessage;
