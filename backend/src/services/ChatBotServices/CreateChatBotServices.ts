import Chatbot from "../../models/Chatbot";

interface ChatbotData {
  name: string;
  color?: string;
  greetingMessage?: string;
  mediaPath?: string;
  queueId?: number;
  chatbotId?: number;
  isAgent?: boolean;
}

const CreateChatBotServices = async (
  chatBotData: ChatbotData
): Promise<Chatbot> => {
  console.log('[CreateChatBotServices] ========== CREATING ==========');
  console.log('[CreateChatBotServices] chatBotData:', JSON.stringify(chatBotData, null, 2));
  console.log('[CreateChatBotServices] mediaPath received:', chatBotData.mediaPath);
  
  const chatBot = await Chatbot.create(chatBotData);
  
  console.log('[CreateChatBotServices] Chatbot created with ID:', chatBot.id);
  console.log('[CreateChatBotServices] Final mediaPath:', chatBot.mediaPath);
  console.log('[CreateChatBotServices] ========== CREATE COMPLETE ==========');
  
  return chatBot;
};

export default CreateChatBotServices;
