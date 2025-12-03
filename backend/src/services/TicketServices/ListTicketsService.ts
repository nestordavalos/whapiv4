import { Op, fn, where, col, Filterable, Includeable } from "sequelize";
import { startOfDay, endOfDay, parseISO } from "date-fns";

import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import Whatsapp from "../../models/Whatsapp";
import Tag from "../../models/Tag";
import ShowUserService from "../UserServices/ShowUserService";
import ListSettingsServiceOne from "../SettingServices/ListSettingsServiceOne";
import User from "../../models/User";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  status?: string;
  date?: string;
  showAll?: string;
  userId: string;
  withUnreadMessages?: string;
  queueIds: number[];
  tags?: number[];
  whatsappIds?: number[];
  userIds?: number[];
}

interface Response {
  tickets: Ticket[];
  count: number;
  hasMore: boolean;
}

const ListTicketsService = async ({
  searchParam = "",
  pageNumber = "1",
  queueIds,
  tags,
  whatsappIds,
  userIds,
  status,
  date,
  showAll,
  userId,
  withUnreadMessages
}: Request): Promise<Response> => {
  let whereCondition: Filterable["where"] = {
    [Op.or]: [{ userId }, { status: "pending" }]
  };
  let includeCondition: Includeable[];

  includeCondition = [
    {
      model: Contact,
      as: "contact",
      attributes: ["id", "name", "number", "profilePicUrl"],
      include: [
        {
          model: Tag,
          as: "tags",
          attributes: ["id", "name", "color"],
          through: { attributes: [] }
        }
      ]
    },
    {
      model: Queue,
      as: "queue",
      attributes: ["id", "name", "color"]
    },
    {
      model: Whatsapp,
      as: "whatsapp",
      attributes: ["id", "name"]
    },
    {
      model: User,
      as: "user",
      attributes: ["id", "name"]
    }
  ];

  // Aplicar filtro de sectores solo si se especifican
  if (queueIds && queueIds.length > 0) {
    whereCondition = {
      ...whereCondition,
      queueId: {
        [Op.or]: [{ [Op.in]: queueIds }, { [Op.is]: null }]
      }
    };
  }

  if (showAll === "true") {
    // En modo showAll, si hay queueIds los aplicamos, sino mostramos todos
    if (queueIds && queueIds.length > 0) {
      whereCondition = {
        queueId: {
          [Op.or]: [{ [Op.in]: queueIds }, { [Op.is]: null }]
        }
      };
    } else {
      whereCondition = {};
    }
  }

  // Filtro por etiquetas
  if (tags && tags.length > 0) {
    whereCondition = {
      ...whereCondition,
      "$contact.tags.id$": { [Op.in]: tags }
    };
  }

  // Filtro por conexiones (WhatsApp)
  if (whatsappIds && whatsappIds.length > 0) {
    whereCondition = {
      ...whereCondition,
      whatsappId: { [Op.in]: whatsappIds }
    };
  }

  // Filtro por agentes/usuarios atribuidos
  if (userIds && userIds.length > 0) {
    whereCondition = {
      ...whereCondition,
      userId: { [Op.in]: userIds }
    };
  }

  if (status) {
    whereCondition = {
      ...whereCondition,
      status
    };
  }

  if (searchParam) {
    const sanitizedSearchParam = searchParam.toLocaleLowerCase().trim();
    const isNumeric = /^\d+$/.test(sanitizedSearchParam);

    const messageWhere = isNumeric
      ? {}
      : { bodySearch: { [Op.like]: `%${sanitizedSearchParam}%` } };

    includeCondition = [
      ...includeCondition,
      {
        model: Message,
        as: "messages",
        attributes: [],
        where: messageWhere,
        required: false,
        duplicating: false
      }
    ];

    const orConditions: any[] = [
      { "$contact.number$": { [Op.like]: `${sanitizedSearchParam}%` } },
      !isNumeric && {
        "$contact.name$": where(
          fn("LOWER", col("contact.name")),
          "LIKE",
          `%${sanitizedSearchParam}%`
        )
      },
      !isNumeric && {
        "$messages.bodySearch$": { [Op.like]: `%${sanitizedSearchParam}%` }
      }
    ].filter(Boolean);

    whereCondition = {
      ...whereCondition,
      [Op.or]: orConditions
    };
  }

  if (date) {
    whereCondition = {
      createdAt: {
        [Op.between]: [+startOfDay(parseISO(date)), +endOfDay(parseISO(date))]
      }
    };
  }

  if (withUnreadMessages === "true") {
    const user = await ShowUserService(userId);
    const userQueueIds = user.queues.map(queue => queue.id);

    whereCondition = {
      [Op.or]: [{ userId }, { status: "pending" }],
      queueId: { [Op.or]: [userQueueIds, null] },
      unreadMessages: { [Op.gt]: 0 }
    };
  }

  const limit = 100;
  const offset = limit * (+pageNumber - 1);

  const listSettingsService = await ListSettingsServiceOne({ key: "ASC" });
  let settingASC = listSettingsService?.value;

  settingASC = settingASC === "enabled" ? "ASC" : "DESC";

  const listSettingsService2 = await ListSettingsServiceOne({ key: "created" });
  let settingCreated = listSettingsService2?.value;

  settingCreated = settingCreated === "enabled" ? "createdAt" : "updatedAt";

  const count = await Ticket.count({
    where: whereCondition,
    include: includeCondition,
    distinct: true
  });

  const tickets = await Ticket.findAll({
    where: whereCondition,
    include: includeCondition,
    subQuery: false,
    distinct: true,
    limit,
    offset,
    order: [[settingCreated, settingASC]]
  } as any);

  const hasMore = count > offset + tickets.length;

  return {
    tickets,
    count,
    hasMore
  };
};

export default ListTicketsService;
