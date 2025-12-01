import Queue from "../../models/Queue";
import Chatbot from "../../models/Chatbot";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";

const ListQueuesService = async (): Promise<Queue[]> => {
  const queues = await Queue.findAll({
    include: [
      {
        model: Chatbot,
        as: "chatbots",
        attributes: ["id", "name", "greetingMessage", "isAgent"]
      },
      {
        model: User,
        as: "users",
        attributes: ["id", "name"],
        through: { attributes: [] }
      },
      {
        model: Whatsapp,
        as: "whatsapps",
        attributes: ["id", "name"],
        through: { attributes: [] }
      }
    ],
    order: [
      ["name", "ASC"],
      [{ model: Chatbot, as: "chatbots" }, "id", "ASC"]
    ]
  });

  return queues;
};

export default ListQueuesService;
