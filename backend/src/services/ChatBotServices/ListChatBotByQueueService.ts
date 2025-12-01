import Chatbot from "../../models/Chatbot";

const ListChatBotByQueueService = async (
  queueId: number | string
): Promise<Chatbot[]> => {
  const chatbots = await Chatbot.findAll({
    where: {
      queueId
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

export default ListChatBotByQueueService;
