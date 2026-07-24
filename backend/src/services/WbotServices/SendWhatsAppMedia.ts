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
import { isZapoTrustedContactPrivacyNack } from "../../helpers/ZapoErrors";
import Whatsapp from "../../models/Whatsapp";
import {
  getZapoQuoteMetadata,
  hasZapoTrustedContactToken,
  resolveZapoRecipientJid,
  sendZapoMessage
} from "../../libs/zapo";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { sendMessageSentWebhook } from "../WebhookService/SendWebhookEvent";
import {
  assertZapoRecipientCanReceive,
  blockZapoRecipientSend,
  unblockZapoRecipientForTicket
} from "./ZapoRecipientSendBlockService";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  body?: string;
  voiceNote?: boolean;
  quotedMsg?: Message;
  persistMessage?: boolean;
}

const SendWhatsAppMedia = async ({
  media,
  ticket,
  body,
  voiceNote = false,
  quotedMsg,
  persistMessage = true
}: Request): Promise<WbotMessage> => {
  const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);
  const isAudioFilename =
    media.mimetype.startsWith("audio/") &&
    Boolean(body && /\.(mp3|mpeg|ogg|opus|wav|webm|m4a|aac)$/i.test(body));
  const hasBody = body && !isAudioFilename ? formatBody(body, ticket) : undefined;

  if (whatsapp?.provider === "zapo") {
    try {
      const remoteJid = await resolveZapoRecipientJid(
        whatsapp.id,
        ticket.contact.number,
        ticket.isGroup,
        ticket.contact.remoteJid
      );
      if (await hasZapoTrustedContactToken(whatsapp.id, remoteJid)) {
        await unblockZapoRecipientForTicket(ticket);
      }
      await assertZapoRecipientCanReceive(ticket, whatsapp.number);
      const mimeRoot = media.mimetype.split("/")[0];
      const type = ["image", "video", "audio"].includes(mimeRoot)
        ? mimeRoot
        : "document";
      const isVoiceNote =
        type === "audio";
      const quoteMetadata = quotedMsg
        ? await getZapoQuoteMetadata(whatsapp.id, quotedMsg.id)
        : undefined;
      const sent = await sendZapoMessage(
        whatsapp.id,
        remoteJid,
        {
          type,
          media: media.path,
          mimetype: media.mimetype,
          ...(type !== "audio" ? { fileName: media.originalname } : {}),
          ...(hasBody ? { caption: hasBody } : {}),
          ...(isVoiceNote ? { ptt: true } : {})
        },
        {
          quote: quotedMsg
            ? {
                id: quotedMsg.id,
                remoteJid,
                fromMe: quotedMsg.fromMe,
                participant: quoteMetadata?.participant,
                message: quoteMetadata?.message
              }
            : undefined
        }
      );
      if (persistMessage) {
        await CreateMessageService({
          messageData: {
            id: sent.id,
            ticketId: ticket.id,
            body: hasBody || "",
            fromMe: true,
            read: true,
            mediaUrl: media.filename,
            mediaType: type,
            quotedMsgId: quotedMsg?.id,
            ack: 1,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
      await ticket.update({
        lastMessage: hasBody || (type === "audio" ? "🎵 Audio" : media.filename)
      });
      await sendMessageSentWebhook(whatsapp.id, {
        messageId: sent.id,
        body: hasBody || "",
        fromMe: true,
        mediaType: type,
        hasMedia: true,
        timestamp: Math.floor(Date.now() / 1000),
        ticketId: ticket.id,
        contact: {
          id: ticket.contact.id,
          name: ticket.contact.name,
          number: ticket.contact.number,
          phoneNumber: ticket.contact.number,
          lidJid: remoteJid
        },
        media: {
          url: media.filename,
          mimeType: media.mimetype,
          type
        }
      });
      return {
        id: { id: sent.id },
        body: hasBody || "",
        timestamp: Math.floor(Date.now() / 1000),
        fromMe: true,
        hasMedia: true,
        ack: 1
      } as unknown as WbotMessage;
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (isZapoTrustedContactPrivacyNack(err)) {
        logger.warn(
          { ticketId: ticket.id, err },
          "Zapo media recipient requires a trusted-contact token"
        );
        await blockZapoRecipientSend(ticket, whatsapp.number);
        throw new AppError("ERR_WAPP_RECIPIENT_REQUIRES_CONTACT", 422);
      }
      logger.error({ ticketId: ticket.id, err }, "Error sending Zapo media");
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
