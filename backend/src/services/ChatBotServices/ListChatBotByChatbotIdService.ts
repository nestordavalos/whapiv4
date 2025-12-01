import Chatbot from "../../models/Chatbot";

const ListChatBotByChatbotIdService = async (
  chatbotId: number | string
): Promise<Chatbot[]> => {
  const chatbots = await Chatbot.findAll({
    where: {
      chatbotId
    },
    include: [
      {
        model: Chatbot,
        as: "options",
        separate: true,
        order: [["id", "ASC"]],
        include: [
          {
            model: Chatbot,
            as: "options",
            separate: true,
            order: [["id", "ASC"]]
          }
        ]
      }
    ],
    order: [["id", "ASC"]]
  });

  return chatbots;
};

export default ListChatBotByChatbotIdService;
