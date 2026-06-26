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
  sendMessageWithLidFallback
} from "../../helpers/GetContactJid";

const MAX_SEND_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 500;
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
  const formattedBody = formatBody(body, ticket);
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
      await delay(1000);

      const storedSentMessage = await Message.findOne({
        where: {
          ticketId: ticket.id,
          fromMe: true,
          body: formattedBody,
          mediaUrl: null,
          createdAt: { [Op.gte]: sendStartedAt }
        },
        order: [["createdAt", "DESC"]]
      });

      if (storedSentMessage) {
        logger.warn(
          {
            ticketId: ticket.id,
            whatsappId,
            messageId: storedSentMessage.id,
            err
          },
          "WhatsApp text send reported an error, but outgoing message was stored"
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
        const [lastMessage] = await chat.fetchMessages({ limit: 1 });
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
