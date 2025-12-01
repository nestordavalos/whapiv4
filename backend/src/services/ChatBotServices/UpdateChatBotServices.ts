import AppError from "../../errors/AppError";
import Chatbot from "../../models/Chatbot";

interface ChatbotData {
  id?: number;
  name?: string;
  greetingMessage?: string;
  mediaPath?: string;
  queueId?: number;
  chatbotId?: number;
  isAgent?: boolean;
  options?: Chatbot[];
}

const UpdateChatBotServices = async (
  chatBotId: number | string,
  chatbotData: ChatbotData
): Promise<Chatbot> => {
  console.log('[UpdateChatBotServices] ========== UPDATING ==========');
  console.log('[UpdateChatBotServices] chatBotId:', chatBotId);
  console.log('[UpdateChatBotServices] chatbotData:', JSON.stringify(chatbotData, null, 2));
  console.log('[UpdateChatBotServices] mediaPath received:', chatbotData.mediaPath);
  
  const { options } = chatbotData;

  const chatbot = await Chatbot.findOne({
    where: { id: chatBotId },
    include: ["options"],
    order: [["id", "asc"]]
  });

  if (!chatbot) {
    throw new AppError("ERR_NO_CHATBOT_FOUND", 404);
  }

  if (options) {
    await Promise.all(
      options.map(async bot => {
        await Chatbot.upsert({ ...bot, chatbotId: chatbot.id });
      })
    );

    await Promise.all(
      chatbot.options.map(async oldBot => {
        const stillExists = options.findIndex(bot => bot.id === oldBot.id);

        if (stillExists === -1) {
          await Chatbot.destroy({ where: { id: oldBot.id } });
        }
      })
    );
  }

  console.log('[UpdateChatBotServices] Updating chatbot with data:', JSON.stringify(chatbotData, null, 2));
  await chatbot.update(chatbotData);

  console.log('[UpdateChatBotServices] Chatbot updated, reloading...');
  await chatbot.reload({
    include: [
      {
        model: Chatbot,
        as: "mainChatbot",
        attributes: ["id", "name", "greetingMessage", "mediaPath"],
        order: [[{ model: Chatbot, as: "mainChatbot" }, "id", "ASC"]]
      },
      {
        model: Chatbot,
        as: "options",
        order: [[{ model: Chatbot, as: "options" }, "id", "ASC"]],
        attributes: ["id", "name", "greetingMessage", "mediaPath", "isAgent"]
      }
    ],
    order: [["id", "asc"]]
  });

  console.log('[UpdateChatBotServices] Chatbot reloaded. Final mediaPath:', chatbot.mediaPath);
  console.log('[UpdateChatBotServices] ========== UPDATE COMPLETE ==========');

  return chatbot;
};

export default UpdateChatBotServices;
