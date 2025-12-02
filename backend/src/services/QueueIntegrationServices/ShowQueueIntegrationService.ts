import AppError from "../../errors/AppError";
import QueueIntegrations from "../../models/QueueIntegrations";

const ShowQueueIntegrationService = async (
  integrationId: string | number
): Promise<QueueIntegrations> => {
  const integration = await QueueIntegrations.findByPk(integrationId);

  if (!integration) {
    throw new AppError("ERR_NO_INTEGRATION_FOUND", 404);
  }

  return integration;
};

export default ShowQueueIntegrationService;
