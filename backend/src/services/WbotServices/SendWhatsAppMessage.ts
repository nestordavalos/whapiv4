import { Client, Message as WbotMessage } from "whatsapp-web.js";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import GetWbotMessage from "../../helpers/GetWbotMessage";
import SerializeWbotMsgId from "../../helpers/SerializeWbotMsgId";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";

import formatBody from "../../helpers/Mustache";
import { logger } from "../../utils/logger";
import { getIO } from "../../libs/socket";

const MAX_SEND_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 500;
const failureTracker = new Map<number, { count: number; lastError: string }>();

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const addJitter = (ms: number) => ms + Math.floor(Math.random() * 250);

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
  const remoteJid = `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`;
  let quotedMsgSerializedId: string | undefined;
  if (quotedMsg) {
    console.log("[SendWhatsAppMessage] Processing quotedMsg:", {
      id: quotedMsg.id,
      body: `${quotedMsg.body?.substring(0, 100)}...`,
      mediaType: quotedMsg.mediaType,
      fromMe: quotedMsg.fromMe
    });
    await GetWbotMessage(ticket, quotedMsg.id);
    quotedMsgSerializedId = SerializeWbotMsgId(ticket, quotedMsg);
    console.log("[SendWhatsAppMessage] Serialized ID:", quotedMsgSerializedId);
  }

  const wbot = await GetTicketWbot(ticket);
  const formattedBody = formatBody(body, ticket);
  const { whatsappId } = ticket;

  const attemptSend = async (): Promise<WbotMessage> => {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt += 1) {
      if (!(await isSessionConnected(wbot))) {
        throw new AppError("ERR_WAPP_SESSION");
      }

      try {
        console.log("[SendWhatsAppMessage] Sending with options:", {
          remoteJid,
          quotedMessageId: quotedMsgSerializedId,
          bodyLength: formattedBody.length
        });

        const sentMessage = await wbot.sendMessage(remoteJid, formattedBody, {
          quotedMessageId: quotedMsgSerializedId,
          linkPreview: false
        });

        console.log("[SendWhatsAppMessage] Message sent successfully:", {
          id: sentMessage.id.id,
          hasQuoted: !!sentMessage.hasQuotedMsg
        });

        await ticket.update({ lastMessage: body });
        resetFailures(whatsappId);
        return sentMessage;
      } catch (error: any) {
        lastError = error;
        recordFailure(whatsappId, error);
        const delayMs = addJitter(BASE_BACKOFF_MS * attempt);
        logger.warn(
          `Attempt ${attempt} to send WhatsApp message failed (ticket ${ticket.id}): ${error.message}`
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
      const chat = await wbot.getChatById(remoteJid);
      const [lastMessage] = await chat.fetchMessages({ limit: 1 });
      if (
        lastMessage &&
        lastMessage.fromMe &&
        lastMessage.body === formattedBody
      ) {
        await ticket.update({ lastMessage: body });
        return lastMessage as WbotMessage;
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
