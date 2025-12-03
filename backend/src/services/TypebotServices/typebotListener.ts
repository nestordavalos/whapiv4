import axios from "axios";
import { isNil } from "lodash";
import { Client, Message as WbotMessage, MessageMedia } from "whatsapp-web.js";

import QueueIntegrations from "../../models/QueueIntegrations";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";
import UpdateTicketService from "../TicketServices/UpdateTicketService";

type Session = Client & {
  id?: number;
};

interface Request {
  wbot: Session;
  msg: WbotMessage;
  ticket: Ticket;
  typebot: QueueIntegrations;
}

const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const typebotListener = async ({
  wbot,
  msg,
  ticket,
  typebot
}: Request): Promise<void> => {
  if (msg.from === "status@broadcast") return;

  const {
    typebotUrl,
    typebotExpires,
    typebotKeywordFinish,
    typebotKeywordRestart,
    typebotUnknownMessage,
    typebotSlug,
    typebotDelayMessage,
    typebotRestartMessage
  } = typebot;

  // Validate required typebot configuration
  if (!typebotUrl || !typebotSlug) {
    logger.error("Typebot configuration incomplete: missing URL or Slug");
    return;
  }

  const number = msg.from.replace(/\D/g, "");
  const { body } = msg;

  // Skip if no body (media-only messages, etc.)
  if (!body || body.trim() === "") {
    logger.info("Skipping typebot: empty message body");
    return;
  }

  // Function to create a new typebot session
  const createSession = async (
    msgData: WbotMessage,
    contactNumber: string
  ): Promise<any> => {
    try {
      // Get contact name from message
      const contact = await msgData.getContact();
      const contactName = contact?.pushname || contact?.name || "";

      const reqData = {
        isStreamEnabled: true,
        message: msgData.body || "",
        isOnlyRegistering: false,
        prefilledVariables: {
          number: contactNumber,
          name: contactName,
          pushName: contactName,
          email: "",
          visitorId: contactNumber
        }
      };

      logger.info(
        `Creating typebot session for ${contactNumber} (${contactName}) - URL: ${typebotUrl}/api/v1/typebots/${typebotSlug}/startChat`
      );

      const response = await axios.post(
        `${typebotUrl}/api/v1/typebots/${typebotSlug}/startChat`,
        reqData,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          maxBodyLength: Infinity
        }
      );

      logger.info(`Typebot session created: ${response.data?.sessionId}`);
      return response.data;
    } catch (err: any) {
      logger.error(
        `Error creating typebot session: ${err?.response?.status} - ${
          err?.response?.data?.message || err?.message
        }`
      );
      throw err;
    }
  };

  // Function to continue chat
  const continueChat = async (
    sessionId: string,
    message: string
  ): Promise<any> => {
    const reqData = JSON.stringify({
      message
    });

    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: `${typebotUrl}/api/v1/sessions/${sessionId}/continueChat`,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      data: reqData
    };

    const request = await axios.request(config);
    return request.data;
  };

  // Function to send text with typing indicator
  const sendTextWithTyping = async (text: string): Promise<void> => {
    const chat = await msg.getChat();
    await chat.sendStateTyping();
    await delay(typebotDelayMessage || 1000);
    await chat.clearState();
    await wbot.sendMessage(msg.from, text);
  };

  // Function to send media
  const sendMedia = async (
    type: string,
    url: string,
    caption?: string
  ): Promise<void> => {
    const chat = await msg.getChat();

    if (type === "audio") {
      await chat.sendStateRecording();
    } else {
      await chat.sendStateTyping();
    }

    await delay(typebotDelayMessage || 1000);
    await chat.clearState();

    try {
      const media = await MessageMedia.fromUrl(url, { unsafeMime: true });

      if (type === "audio") {
        await wbot.sendMessage(msg.from, media, { sendAudioAsVoice: true });
      } else {
        await wbot.sendMessage(msg.from, media, { caption: caption || "" });
      }
    } catch (error) {
      logger.error(`Error sending media ${type}: `, error);
      // If media fails, send the URL as text
      await wbot.sendMessage(msg.from, `📎 ${url}`);
    }
  };

  // Function to process typebot command
  const processCommand = async (command: string): Promise<boolean> => {
    try {
      const jsonCommand = JSON.parse(command);

      // Stop bot command
      if (
        jsonCommand.stopBot &&
        isNil(jsonCommand.userId) &&
        isNil(jsonCommand.queueId)
      ) {
        await ticket.update({
          useIntegration: false,
          isBot: false,
          typebotSessionId: null,
          typebotStatus: false
        });
        return true;
      }

      // Transfer to queue only
      if (
        !isNil(jsonCommand.queueId) &&
        jsonCommand.queueId > 0 &&
        isNil(jsonCommand.userId)
      ) {
        await UpdateTicketService({
          ticketData: {
            queueId: jsonCommand.queueId,
            useIntegration: false,
            integrationId: null
          },
          ticketId: ticket.id
        });
        // Clear typebot session after transfer
        await ticket.update({
          typebotSessionId: null,
          typebotStatus: false
        });
        return true;
      }

      // Transfer to user and queue
      if (
        !isNil(jsonCommand.queueId) &&
        jsonCommand.queueId > 0 &&
        !isNil(jsonCommand.userId) &&
        jsonCommand.userId > 0
      ) {
        await UpdateTicketService({
          ticketData: {
            queueId: jsonCommand.queueId,
            userId: jsonCommand.userId,
            useIntegration: false,
            integrationId: null
          },
          ticketId: ticket.id
        });
        // Clear typebot session after transfer
        await ticket.update({
          typebotSessionId: null,
          typebotStatus: false
        });
        return true;
      }

      return false;
    } catch {
      return false;
    }
  };

  // Function to format rich text - improved version
  const formatRichText = (richTextContent: any[]): string => {
    // Log the raw structure for debugging
    logger.info(`RichText structure: ${JSON.stringify(richTextContent)}`);

    let formattedText = "";

    // Helper to apply formatting only if text has actual content
    const applyFormatting = (text: string, element: any): string => {
      // Only apply formatting if there's actual non-whitespace content
      const trimmed = text.trim();
      if (!trimmed) return text; // Return original whitespace without formatting

      let result = text;
      if (element.bold) result = `*${result}*`;
      if (element.italic) result = `_${result}_`;
      if (element.underline) result = `~${result}~`;
      return result;
    };

    // Helper to extract text from element recursively
    const extractText = (el: any): string => {
      if (el.text !== undefined) return el.text;
      if (el.children) {
        return el.children.map((child: any) => extractText(child)).join("");
      }
      return "";
    };

    for (const richText of richTextContent || []) {
      let lineText = "";

      // Check if this paragraph has any actual text content
      const hasContent = richText.children?.some(
        (child: any) =>
          child.text && child.text.trim() !== "" && child.text !== "\r"
      );

      if (!hasContent) {
        // Empty paragraph = line break
        formattedText += "\n";
      } else {
        for (const element of richText.children || []) {
          let text = "";

          // Skip elements with only whitespace or carriage return
          if (!element.text || element.text === "\r") {
            // Skip completely empty or carriage return
          } else if (element.text.trim() === "") {
            // Just whitespace, add a space
            lineText += " ";
          } else if (element.type === "a" && element.url) {
            // Handle link elements
            const linkText = extractText(element) || element.url;
            text = `${linkText}: ${element.url}`;
            lineText += text;
          } else if (element.type && element.children) {
            // Handle other nested elements
            for (const subelement of element.children || []) {
              let subtext = extractText(subelement);
              subtext = applyFormatting(subtext, subelement);
              text += subtext;
            }
            text = applyFormatting(text, element);
            lineText += text;
          } else {
            // Simple text element
            text = element.text || "";
            text = applyFormatting(text, element);
            lineText += text;
          }
        }

        // Only add line if it has content
        if (lineText.trim()) {
          formattedText += `${lineText}\n`;
        }
      }
    }

    // Clean up formatting markers (only within same line, not across lines)
    let result = formattedText;

    // Remove * that wrap empty content on same line: ** or * *
    result = result.replace(/\*[^\n*]*\*(?=\s*[\n,]|$)/gm, match => {
      // Only remove if content between * is empty or whitespace
      const content = match.slice(1, -1);
      return content.trim() ? match : "";
    });

    // Simpler approach: just remove empty bold/italic/underline markers
    result = result.replace(/\*\*/g, "");
    result = result.replace(/__/g, "");
    result = result.replace(/~~/g, "");

    // Remove bold markers with only whitespace inside (but not crossing newlines)
    result = result.replace(/\*[ \t]*\*/g, "");
    result = result.replace(/_[ \t]*_/g, "");
    result = result.replace(/~[ \t]*~/g, "");

    // Fix: *Text: * -> *Text:* (remove space before closing *)
    result = result.replace(/\*([^*\n]+?):\s+\*/g, "*$1:*");
    result = result.replace(/_([^_\n]+?):\s+_/g, "_$1:_");
    result = result.replace(/~([^~\n]+?):\s+~/g, "~$1:~");

    // Fix: *Text:* , -> *Text:*, (remove extra space after)
    result = result.replace(/\*([^*\n]+?)\*\s+,/g, "*$1*,");

    // Remove trailing newline only
    result = result.replace(/\n$/, "");

    // Log the final formatted text for debugging
    logger.info(`Formatted text result:\n${result}`);

    return result;
  };

  let sessionId: string;
  let dataStart: any;
  let status = false;

  try {
    const dataLimite = new Date();
    dataLimite.setMinutes(dataLimite.getMinutes() - Number(typebotExpires));

    // Check if session expired
    if (typebotExpires > 0 && ticket.updatedAt < dataLimite) {
      await ticket.update({
        typebotSessionId: null,
        isBot: true
      });
      await ticket.reload();
    }

    // Create new session if needed
    if (isNil(ticket.typebotSessionId)) {
      dataStart = await createSession(msg, number);
      sessionId = dataStart.sessionId;
      status = true;
      await ticket.update({
        typebotSessionId: sessionId,
        typebotStatus: true,
        useIntegration: true,
        integrationId: typebot.id
      });
    } else {
      sessionId = ticket.typebotSessionId;
      status = ticket.typebotStatus ?? false;
    }

    if (!status) return;

    // Handle finish keyword - close/resolve the ticket
    if (typebotKeywordFinish && body === typebotKeywordFinish) {
      logger.info(
        `Finish keyword received for ticket ${ticket.id}, resolving ticket...`
      );

      // Clear typebot session
      await ticket.update({
        typebotSessionId: null,
        typebotStatus: false
      });

      // Close/resolve the ticket
      await UpdateTicketService({
        ticketData: {
          status: "closed",
          useIntegration: false,
          integrationId: null
        },
        ticketId: ticket.id
      });
      return;
    }

    // Handle restart keyword
    if (typebotKeywordRestart && body === typebotKeywordRestart) {
      await ticket.update({
        isBot: true,
        typebotSessionId: null,
        typebotStatus: true
      });
      await ticket.reload();

      if (typebotRestartMessage) {
        await wbot.sendMessage(msg.from, typebotRestartMessage);
      }
      return;
    }

    // Get messages from typebot
    let messages: any[];
    let input: any;

    if (dataStart?.messages?.length === 0 || dataStart === undefined) {
      try {
        const response = await continueChat(sessionId, body);
        messages = response?.messages || [];
        input = response?.input;
      } catch (continueError: any) {
        // If session not found (404), create a new one and retry
        if (continueError?.response?.status === 404) {
          logger.info(
            `Typebot session ${sessionId} expired/not found, creating new session...`
          );
          await ticket.update({
            typebotSessionId: null
          });

          // Create new session
          dataStart = await createSession(msg, number);
          sessionId = dataStart.sessionId;
          await ticket.update({
            typebotSessionId: sessionId,
            typebotStatus: true,
            useIntegration: true,
            integrationId: typebot.id
          });

          messages = dataStart?.messages || [];
          input = dataStart?.input;
        } else {
          throw continueError;
        }
      }
    } else {
      messages = dataStart?.messages || [];
      input = dataStart?.input;
    }

    if (messages.length === 0 && !input) {
      // Flow ended - no more messages and no input expected
      logger.info(
        `Typebot flow ended for ticket ${ticket.id}, clearing session`
      );
      await ticket.update({
        typebotSessionId: null,
        typebotStatus: false,
        useIntegration: false
      });

      if (typebotUnknownMessage) {
        await wbot.sendMessage(msg.from, typebotUnknownMessage);
      }
      return;
    }

    // Process typebot messages
    for (const message of messages) {
      // Log message type for debugging
      logger.info(
        `Typebot message type: ${message.type}, content: ${JSON.stringify(
          message.content
        ).substring(0, 200)}`
      );

      // Text messages
      if (message.type === "text") {
        let formattedText = "";

        if (message.content?.richText) {
          formattedText = formatRichText(message.content.richText);
        } else if (message.content?.html) {
          // Handle HTML content - strip tags and convert basic formatting
          formattedText = message.content.html
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<strong>(.*?)<\/strong>/gi, "*$1*")
            .replace(/<em>(.*?)<\/em>/gi, "_$1_")
            .replace(/<[^>]+>/g, "");
        } else if (typeof message.content === "string") {
          formattedText = message.content;
        }

        if (formattedText === "Invalid message. Please, try again.") {
          formattedText = typebotUnknownMessage || formattedText;
        }

        // Handle special commands (JSON triggers)
        if (formattedText.startsWith("#")) {
          const command = formattedText.replace("#", "");
          const wasCommand = await processCommand(command);
          if (wasCommand) return;
        }

        if (formattedText.trim()) {
          await sendTextWithTyping(formattedText);
        }
      }

      // Audio messages
      if (message.type === "audio") {
        const audioUrl = message.content?.url || message.content;
        if (audioUrl) {
          await sendMedia("audio", audioUrl);
        }
      }

      // Image messages
      if (message.type === "image") {
        const imageUrl = message.content?.url || message.content;
        const caption = message.content?.caption || "";
        if (imageUrl) {
          await sendMedia("image", imageUrl, caption);
        }
      }

      // Video messages - handle YouTube embeds differently
      if (message.type === "video") {
        const videoContent = message.content;

        // Check if it's a YouTube embed (not a downloadable video)
        if (
          videoContent?.type === "youtube" ||
          videoContent?.url?.includes("youtube")
        ) {
          // Send YouTube link as text instead of trying to download
          const youtubeUrl = videoContent.url?.startsWith("http")
            ? videoContent.url
            : `https://${videoContent.url}`;
          await sendTextWithTyping(`🎬 ${youtubeUrl}`);
        } else {
          // Regular video file
          const videoUrl = videoContent?.url || videoContent;
          const caption = videoContent?.caption || "";
          if (videoUrl) {
            await sendMedia("video", videoUrl, caption);
          }
        }
      }

      // Embed/Document messages (PDF, files, etc.)
      if (message.type === "embed") {
        const embedUrl = message.content?.url || message.content;
        if (embedUrl) {
          await sendMedia("document", embedUrl);
        }
      }

      // File messages
      if (message.type === "file") {
        const fileUrl = message.content?.url || message.content;
        if (fileUrl) {
          await sendMedia("document", fileUrl);
        }
      }
    }

    // Handle different input types
    if (input) {
      // Choice input (buttons/options)
      if (input.type === "choice input") {
        let formattedText = "";
        const items = input.items || [];

        for (const item of items) {
          formattedText += `▶️ ${item.content}\n`;
        }

        formattedText = formattedText.replace(/\n$/, "");
        if (formattedText) {
          await sendTextWithTyping(formattedText);
        }
      }

      // Text input (just continue, no additional message needed)
      // Number input
      // Email input
      // URL input
      // Phone input
      // Date input
      // These types don't need special handling - user just types their response
    }
  } catch (error: any) {
    const errorDetails = {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
      url: error?.config?.url
    };
    logger.error(
      `Error on typebotListener: ${JSON.stringify(errorDetails, null, 2)}`
    );

    // Only reset session if it's a session-related error
    if (error?.response?.status === 404 || error?.response?.status === 400) {
      await ticket.update({
        typebotSessionId: null
      });
    }

    // Don't throw - just log and continue to avoid breaking the message flow
  }
};

export default typebotListener;
