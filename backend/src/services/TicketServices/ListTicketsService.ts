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
import AppError from "../../errors/AppError";

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
  // Cargar usuario con sus queues para validar permisos
  const user = await ShowUserService(userId);
  const userQueueIds = user.queues.map(queue => queue.id);
  const isAdmin = user.profile === "admin";
  const canShowAll = isAdmin || user.allTicket === "enabled";

  // Validar permiso para showAll
  if (showAll === "true" && !canShowAll) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  // Filtrar queueIds recibidos para incluir solo aquellos que pertenecen al usuario
  let allowedQueueIds: number[] | undefined;
  if (showAll === "true" && canShowAll) {
    // Si tiene permiso para ver todos, usar los queueIds especificados o ninguno (ver todos)
    allowedQueueIds = queueIds && queueIds.length > 0 ? queueIds : undefined;
  } else {
    // Si no tiene permiso para showAll, validar que los queueIds pertenecen al usuario
    if (queueIds && queueIds.length > 0) {
      // Filtrar solo los queueIds que el usuario tiene asignados
      allowedQueueIds = queueIds.filter(qid => userQueueIds.includes(qid));
      if (allowedQueueIds.length === 0) {
        // Si ninguno de los queueIds pertenece al usuario, usar sus queues
        allowedQueueIds = userQueueIds;
      }
    } else {
      // Si no se especificaron queueIds, usar las queues del usuario
      allowedQueueIds = userQueueIds;
    }
  }

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

  // Aplicar filtro de sectores validados
  if (allowedQueueIds && allowedQueueIds.length > 0) {
    whereCondition = {
      ...whereCondition,
      queueId: {
        [Op.or]: [{ [Op.in]: allowedQueueIds }, { [Op.is]: null }]
      }
    };
  } else if (showAll !== "true") {
    // Si no hay allowedQueueIds y no es showAll, no mostrar nada
    whereCondition = {
      ...whereCondition,
      queueId: { [Op.is]: null }
    };
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

  // Optimización: Obtener tickets primero para verificar hasMore sin COUNT costoso
  const tickets = await Ticket.findAll({
    where: whereCondition,
    include: includeCondition,
    subQuery: false,
    distinct: true,
    limit: limit + 1, // Fetch one extra to check if there are more
    offset,
    order: [[settingCreated, settingASC]]
  } as any);

  // Determinar hasMore basándose en si obtuvimos más de 'limit' tickets
  const hasMore = tickets.length > limit;
  
  // Si hay más, remover el ticket extra
  if (hasMore) {
    tickets.pop();
  }

  // Solo calcular count si es la primera página (para mostrar total)
  // De lo contrario, estimarlo
  let count: number;
  if (+pageNumber === 1) {
    // Primera página: calcular count real solo si no hay búsqueda pesada
    if (!searchParam) {
      count = await Ticket.count({
        where: whereCondition,
        include: includeCondition.filter(inc => 
          // Excluir Message include del count para hacerlo más rápido
          !(inc as any).model || (inc as any).model.name !== 'Message'
        ),
        distinct: true
      });
    } else {
      // Con búsqueda, estimar basado en resultados
      count = hasMore ? limit + 1 : tickets.length;
    }
  } else {
    // Páginas subsecuentes: estimar count basado en offset + resultados
    count = offset + tickets.length + (hasMore ? 1 : 0);
  }

  return {
    tickets,
    count,
    hasMore
  };
};

export default ListTicketsService;
