import { MessageMedia, Message as WbotMessage } from "whatsapp-web.js";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import GetWbotMessage from "../../helpers/GetWbotMessage";
import SerializeWbotMsgId from "../../helpers/SerializeWbotMsgId";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";

import formatBody from "../../helpers/Mustache";
import { logger } from "../../utils/logger";
import {
  getContactJid,
  resolveLidFromPhone,
  sendMessageWithLidFallback
} from "../../helpers/GetContactJid";
import { isFetchMessagesStoreError } from "../../helpers/WhatsAppWebErrors";
import Whatsapp from "../../models/Whatsapp";
import { getWhaileys, whaileysJid } from "../../libs/whaileys";
import CreateMessageService from "../MessageServices/CreateMessageService";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  body?: string;
  quotedMsg?: Message;
}

const SendWhatsAppMedia = async ({
  media,
  ticket,
  body,
  quotedMsg
}: Request): Promise<WbotMessage> => {
  const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);
  const hasBody = body ? formatBody(body, ticket) : undefined;

  if (whatsapp?.provider === "whaileys") {
    try {
      const socket = getWhaileys(whatsapp.id);
      const remoteJid = whaileysJid(
        ticket.contact.number,
        ticket.isGroup,
        ticket.contact.remoteJid
      );
      const mimeRoot = media.mimetype.split("/")[0];
      const content: any = {
        caption: hasBody,
        fileName: media.originalname,
        mimetype: media.mimetype
      };
      if (mimeRoot === "image") content.image = { url: media.path };
      else if (mimeRoot === "video") content.video = { url: media.path };
      else if (mimeRoot === "audio") {
        content.audio = { url: media.path };
        content.ptt = true;
      } else content.document = { url: media.path };

      const sent = await socket.sendMessage(
        remoteJid,
        content,
        quotedMsg
          ? ({
              quoted: {
                key: { id: quotedMsg.id, remoteJid, fromMe: quotedMsg.fromMe }
              }
            } as any)
          : undefined
      );
      const id = sent?.key.id;
      if (!id) throw new Error("Whaileys did not return a media message id");
      await CreateMessageService({
        messageData: {
          id,
          ticketId: ticket.id,
          body: hasBody || "",
          fromMe: true,
          read: true,
          mediaType: mimeRoot,
          quotedMsgId: quotedMsg?.id,
          ack: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      await ticket.update({ lastMessage: body || media.filename });
      return {
        id: { id },
        body: hasBody || "",
        timestamp: Math.floor(Date.now() / 1000),
        fromMe: true,
        hasMedia: true,
        ack: 0
      } as unknown as WbotMessage;
    } catch (err) {
      logger.error(
        { ticketId: ticket.id, err },
        "Error sending Whaileys media"
      );
      if (err instanceof AppError) throw err;
      throw new AppError("ERR_SENDING_WAPP_MSG");
    }
  }

  let quotedMsgSerializedId: string | undefined;
  if (quotedMsg) {
    try {
      await GetWbotMessage(ticket, quotedMsg.id);
    } catch (err) {
      logger.debug(
        "Could not fetch quoted media message, using fallback serialization"
      );
    }
    quotedMsgSerializedId = SerializeWbotMsgId(ticket, quotedMsg);
  }

  const wbot = await GetTicketWbot(ticket);

  try {
    const newMedia = MessageMedia.fromFilePath(media.path);
    const sentMessage = await sendMessageWithLidFallback(
      wbot,
      ticket.contact.number,
      ticket.isGroup,
      newMedia,
      {
        caption: hasBody,
        sendAudioAsVoice: true,
        quotedMessageId: quotedMsgSerializedId
      }
    );

    await ticket.update({ lastMessage: body || media.filename });
    // NO borrar el archivo - se necesita para mostrarlo en el panel
    // fs.unlinkSync(media.path);
    return sentMessage;
  } catch (err) {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      let chat;
      const primaryJid = getContactJid(ticket.contact.number, ticket.isGroup);
      try {
        chat = await wbot.getChatById(primaryJid);
      } catch {
        if (!ticket.isGroup && !primaryJid.endsWith("@lid")) {
          const lidNumber = await resolveLidFromPhone(
            wbot,
            ticket.contact.number
          );
          if (lidNumber) {
            chat = await wbot.getChatById(`${lidNumber}@lid`);
          }
        }
      }
      let lastMessage: WbotMessage | undefined;

      try {
        [lastMessage] = await chat.fetchMessages({ limit: 1 });
      } catch (fetchErr) {
        if (isFetchMessagesStoreError(fetchErr)) {
          logger.warn(
            `WhatsApp media send verification could not read chat history for ticket ${ticket.id}: ${fetchErr}`
          );
        } else {
          throw fetchErr;
        }
      }

      if (lastMessage && lastMessage.fromMe && lastMessage.hasMedia) {
        await ticket.update({ lastMessage: body || media.filename });
        // NO borrar el archivo - se necesita para mostrarlo en el panel
        // fs.unlinkSync(media.path);
        return lastMessage as WbotMessage;
      }
    } catch (checkErr) {
      logger.warn(`Failed to verify sent media: ${checkErr}`);
    }

    // NO borrar el archivo - se necesita para mostrarlo en el panel
    // fs.unlinkSync(media.path);
    logger.warn(`Error sending WhatsApp media: ${err}`);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMedia;
