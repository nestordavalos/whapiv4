import { Op } from "sequelize";
import QueueIntegrations from "../../models/QueueIntegrations";

interface Request {
  searchParam?: string;
  pageNumber?: string;
}

interface Response {
  queueIntegrations: QueueIntegrations[];
  count: number;
  hasMore: boolean;
}

const ListQueueIntegrationService = async ({
  searchParam = "",
  pageNumber = "1"
}: Request): Promise<Response> => {
  const whereCondition = {
    [Op.or]: [
      { name: { [Op.like]: `%${searchParam}%` } },
      { type: { [Op.like]: `%${searchParam}%` } }
    ]
  };

  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: queueIntegrations } =
    await QueueIntegrations.findAndCountAll({
      where: whereCondition,
      limit,
      offset,
      order: [["name", "ASC"]]
    });

  const hasMore = count > offset + queueIntegrations.length;

  return {
    queueIntegrations,
    count,
    hasMore
  };
};

export default ListQueueIntegrationService;
