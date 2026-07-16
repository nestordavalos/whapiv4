import { Client, Message as WbotMessage } from "whatsapp-web.js";
import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import GetWbotMessage from "../../helpers/GetWbotMessage";
import SerializeWbotMsgId from "../../helpers/SerializeWbotMsgId";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";

import formatBody from "../../helpers/Mustache";
import { logger } from "../../utils/logger";
import { getIO } from "../../libs/socket";
import {
  getContactJid,
  resolveLidFromPhone,
  sendMessageWithLidFallback,
  WhatsAppSendUnconfirmedError
} from "../../helpers/GetContactJid";
import { isFetchMessagesStoreError } from "../../helpers/WhatsAppWebErrors";
import Whatsapp from "../../models/Whatsapp";
import { getWhaileys, whaileysJid } from "../../libs/whaileys";
import { getZapoQuoteMetadata, resolveZapoRecipientJid, sendZapoMessage } from "../../libs/zapo";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { sendMessageSentWebhook } from "../WebhookService/SendWebhookEvent";

const MAX_SEND_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 500;
const STORED_MESSAGE_CHECK_ATTEMPTS = 8;
const STORED_MESSAGE_CHECK_DELAY_MS = 750;
const failureTracker = new Map<number, { count: number; lastError: string }>();

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const addJitter = (ms: number) => ms + Math.floor(Math.random() * 250);

const buildSentMessageFromStoredMessage = (
  message: Message,
  body: string
): WbotMessage =>
  ({
    id: { id: message.id },
    body,
    timestamp: Math.floor(new Date(message.createdAt).getTime() / 1000),
    fromMe: true,
    hasMedia: false,
    ack: message.ack
  } as unknown as WbotMessage);

const findStoredSentMessage = async (
  ticketId: number,
  formattedBody: string,
  sendStartedAt: Date
): Promise<Message | null> => {
  const storedMessage = await Message.findOne({
    where: {
      ticketId,
      fromMe: true,
      body: formattedBody,
      mediaUrl: null,
      createdAt: { [Op.gte]: sendStartedAt }
    },
    order: [["createdAt", "DESC"]]
  });

  if (storedMessage && storedMessage.ack > 0) {
    return storedMessage;
  }

  return null;
};

const errorToString = (error: unknown): string => {
  if (error instanceof Error) {
    return error.stack || error.message;
  }

  try {
    return JSON.stringify(error);
  } catch (jsonErr) {
    logger.warn(`Failed to stringify error: ${jsonErr}`);
    return String(error);
  }
};

const resetFailures = (whatsappId?: number) => {
  if (!whatsappId) return;
  failureTracker.delete(whatsappId);
};

const recordFailure = (whatsappId: number | undefined, error: Error) => {
  if (!whatsappId) return;

  const current = failureTracker.get(whatsappId) || { count: 0, lastError: "" };
  const next = { count: current.count + 1, lastError: error.message };
  failureTracker.set(whatsappId, next);

  if (next.count === MAX_SEND_ATTEMPTS) {
    logger.warn(
      `WhatsApp ${whatsappId} failed to send ${next.count} times consecutively: ${error.message}`
    );
    getIO().emit("whatsapp:error", {
      whatsappId,
      message: error.message
    });
  }
};

const isSessionConnected = async (client: Client): Promise<boolean> => {
  try {
    const state = await client.getState();
    if (!state) {
      return true;
    }

    const normalized = String(state).toUpperCase();
    return normalized !== "DISCONNECTED" && normalized !== "UNPAIRED";
  } catch (error) {
    logger.warn(`Unable to determine WhatsApp session state: ${error}`);
    return true;
  }
};

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
}

const SendWhatsAppMessage = async ({
  body,
  ticket,
  quotedMsg
}: Request): Promise<WbotMessage> => {
  const formattedBody = formatBody(body, ticket);
  const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);

  if (whatsapp?.provider === "whaileys") {
    try {
      const socket = getWhaileys(whatsapp.id);
      const remoteJid = whaileysJid(
        ticket.contact.number,
        ticket.isGroup,
        ticket.contact.remoteJid
      );
      const sent = await socket.sendMessage(
        remoteJid,
        { text: formattedBody },
        quotedMsg
          ? {
              quoted: {
                key: {
                  id: quotedMsg.id,
                  remoteJid,
                  fromMe: quotedMsg.fromMe
                }
              } as any
            }
          : undefined
      );
      const id = sent?.key.id;
      if (!id) throw new Error("Whaileys did not return a message id");

      await CreateMessageService({
        messageData: {
          id,
          ticketId: ticket.id,
          body: formattedBody,
          fromMe: true,
          read: true,
          mediaType: "chat",
          quotedMsgId: quotedMsg?.id,
          ack: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      await ticket.update({ lastMessage: body });
      logger.info(
        { whatsappId: whatsapp.id, ticketId: ticket.id, messageId: id },
        "Whaileys text message sent"
      );
      return {
        id: { id },
        body: formattedBody,
        timestamp: Math.floor(Date.now() / 1000),
        fromMe: true,
        hasMedia: false,
        ack: 0
      } as unknown as WbotMessage;
    } catch (err) {
      logger.error(
        { ticketId: ticket.id, err },
        "Error sending Whaileys message"
      );
      if (err instanceof AppError) throw err;
      throw new AppError("ERR_SENDING_WAPP_MSG");
    }
  }

  if (whatsapp?.provider === "zapo") {
    try {
      // Keep the addressing supplied by WhatsApp. A contact can be addressed
      // by LID even when we display/store its real phone number; sending to
      // the phone JID in that case loses the privacy-token context and may be
      // rejected by WhatsApp with ACK 463.
      const remoteJid = await resolveZapoRecipientJid(
        whatsapp.id,
        ticket.contact.number,
        ticket.isGroup,
        ticket.contact.remoteJid
      );
      const quoteMetadata = quotedMsg
        ? await getZapoQuoteMetadata(whatsapp.id, quotedMsg.id)
        : undefined;
      const sent = await sendZapoMessage(whatsapp.id, remoteJid, formattedBody, {
        // Zapo resolves the full WhatsApp quote context from this reference.
        // Keeping `fromMe` matters for replies to an agent's own message.
        quote: quotedMsg
          ? {
              id: quotedMsg.id,
              remoteJid,
              fromMe: quotedMsg.fromMe,
              participant: quoteMetadata?.participant,
              message: quoteMetadata?.message
            }
          : undefined
      });
      await CreateMessageService({
        messageData: {
          id: sent.id,
          ticketId: ticket.id,
          body: formattedBody,
          fromMe: true,
          read: true,
          mediaType: "chat",
          quotedMsgId: quotedMsg?.id,
          ack: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      await ticket.update({ lastMessage: body });
      await sendMessageSentWebhook(whatsapp.id, {
        messageId: sent.id,
        body: formattedBody,
        fromMe: true,
        mediaType: "chat",
        hasMedia: false,
        timestamp: Math.floor(Date.now() / 1000),
        ticketId: ticket.id,
        contact: {
          id: ticket.contact.id,
          name: ticket.contact.name,
          number: ticket.contact.number
        },
        media: null
      });
      return {
        id: { id: sent.id },
        body: formattedBody,
        timestamp: Math.floor(Date.now() / 1000),
        fromMe: true,
        hasMedia: false
      } as WbotMessage;
    } catch (err) {
      logger.error({ ticketId: ticket.id, err }, "Error sending Zapo message");
      throw err;
    }
  }

  let quotedMsgSerializedId: string | undefined;
  if (quotedMsg) {
    logger.debug(
      {
        id: quotedMsg.id,
        mediaType: quotedMsg.mediaType,
        fromMe: quotedMsg.fromMe
      },
      "Processing quotedMsg"
    );
    try {
      const wbotMessage = await GetWbotMessage(ticket, quotedMsg.id);
      // Usar el ID serializado real de WhatsApp en lugar de construir uno personalizado
      // eslint-disable-next-line no-underscore-dangle
      quotedMsgSerializedId = wbotMessage.id._serialized;
      logger.debug(
        "Using real WhatsApp serialized ID: %s",
        quotedMsgSerializedId
      );
    } catch (err) {
      logger.debug(
        "Could not fetch quoted message, trying with custom serialization"
      );
      quotedMsgSerializedId = SerializeWbotMsgId(ticket, quotedMsg);
      logger.debug("Using fallback serialized ID: %s", quotedMsgSerializedId);
    }
  }

  const wbot = await GetTicketWbot(ticket);
  const { whatsappId } = ticket;
  const { number } = ticket.contact;
  const { isGroup } = ticket;
  const sendStartedAt = new Date(Date.now() - 2000);

  const sendOptions = {
    quotedMessageId: quotedMsgSerializedId,
    linkPreview: false
  };

  const attemptSend = async (): Promise<WbotMessage> => {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt += 1) {
      if (!(await isSessionConnected(wbot))) {
        throw new AppError("ERR_WAPP_SESSION");
      }

      try {
        logger.debug(
          { attempt, number, isGroup, bodyLength: formattedBody.length },
          "Sending WhatsApp message"
        );

        // sendMessageWithLidFallback already tries @c.us then @lid internally
        const sentMessage = await sendMessageWithLidFallback(
          wbot,
          number,
          isGroup,
          formattedBody,
          sendOptions
        );

        if (!sentMessage || !sentMessage.id) {
          throw new Error(
            `sendMessage returned invalid result for contact ${number}`
          );
        }

        logger.debug(
          { id: sentMessage.id.id, hasQuoted: !!sentMessage.hasQuotedMsg },
          "Message sent successfully"
        );

        await ticket.update({ lastMessage: body });
        resetFailures(whatsappId);
        return sentMessage;
      } catch (error: any) {
        lastError = error;
        const errMsg = error?.message || String(error);

        // The first request may already have reached WhatsApp. Never retry it:
        // verification below will look for the real WhatsApp message ID.
        if (error instanceof WhatsAppSendUnconfirmedError) {
          logger.warn(
            `WhatsApp send for ticket ${ticket.id} has no immediate message ID; verifying without retrying`
          );
          break;
        }

        // If the error is LID-related and the fallback also failed,
        // don't retry — additional attempts won't help
        if (
          errMsg.includes("No LID for user") ||
          errMsg.includes("Lid is missing in chat table") ||
          errMsg.includes("isNewsletter") ||
          errMsg.includes("commonGid")
        ) {
          logger.warn(
            `LID-related send failure for ticket ${ticket.id} (whatsapp ${whatsappId}), skipping retries: ${errMsg}`
          );
          recordFailure(whatsappId, error);
          break;
        }

        recordFailure(whatsappId, error);
        const delayMs = addJitter(BASE_BACKOFF_MS * attempt);
        logger.warn(
          `Attempt ${attempt} to send WhatsApp message failed (ticket ${ticket.id}): ${errMsg}`
        );

        if (attempt < MAX_SEND_ATTEMPTS) {
          await delay(delayMs);
        }
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error("Unknown send failure");
  };

  try {
    return await attemptSend();
  } catch (err) {
    try {
      let storedSentMessage: Message | null = null;

      for (
        let attempt = 1;
        attempt <= STORED_MESSAGE_CHECK_ATTEMPTS;
        attempt += 1
      ) {
        await delay(STORED_MESSAGE_CHECK_DELAY_MS);
        storedSentMessage = await findStoredSentMessage(
          ticket.id,
          formattedBody,
          sendStartedAt
        );

        if (storedSentMessage) {
          break;
        }
      }

      if (storedSentMessage) {
        logger.warn(
          {
            ticketId: ticket.id,
            whatsappId,
            messageId: storedSentMessage.id,
            ack: storedSentMessage.ack,
            err
          },
          "WhatsApp text send reported an error, but outgoing message was acknowledged"
        );

        await ticket.update({ lastMessage: body });
        resetFailures(whatsappId);
        return buildSentMessageFromStoredMessage(storedSentMessage, body);
      }
    } catch (dbCheckErr) {
      logger.warn(
        `Failed to verify sent text message in database for ticket ${
          ticket.id
        } (whatsapp ${whatsappId}): ${errorToString(dbCheckErr)}`
      );
    }

    // Last resort: check if the message was actually delivered despite errors
    try {
      await delay(1000);
      // Try the primary JID first, then the resolved LID if WhatsApp migrated it.
      let chat;
      const primaryJid = getContactJid(number, isGroup);
      try {
        chat = await wbot.getChatById(primaryJid);
      } catch {
        if (!isGroup && !primaryJid.endsWith("@lid")) {
          const lidNumber = await resolveLidFromPhone(wbot, number);
          if (lidNumber) {
            chat = await wbot.getChatById(`${lidNumber}@lid`);
          }
        }
      }
      if (chat) {
        let lastMessage: WbotMessage | undefined;

        try {
          [lastMessage] = await chat.fetchMessages({ limit: 1 });
        } catch (fetchErr) {
          if (isFetchMessagesStoreError(fetchErr)) {
            logger.warn(
              `WhatsApp text send verification could not read chat history for ticket ${
                ticket.id
              } (whatsapp ${whatsappId}): ${errorToString(fetchErr)}`
            );
          } else {
            throw fetchErr;
          }
        }

        if (
          lastMessage &&
          lastMessage.fromMe &&
          lastMessage.body === formattedBody
        ) {
          await ticket.update({ lastMessage: body });
          return lastMessage as WbotMessage;
        }
      }
    } catch (checkErr) {
      logger.warn(
        `Failed to verify sent message for ticket ${
          ticket.id
        } (whatsapp ${whatsappId}): ${errorToString(checkErr)}`
      );
    }

    logger.warn(
      `Error sending WhatsApp message for ticket ${
        ticket.id
      } (whatsapp ${whatsappId}): ${errorToString(err)}`
    );
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMessage;
