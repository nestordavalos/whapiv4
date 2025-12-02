import AppError from "../../errors/AppError";
import QueueIntegrations from "../../models/QueueIntegrations";

const DeleteQueueIntegrationService = async (
  integrationId: string | number
): Promise<void> => {
  const integration = await QueueIntegrations.findByPk(integrationId);

  if (!integration) {
    throw new AppError("ERR_NO_INTEGRATION_FOUND", 404);
  }

  await integration.destroy();
};

export default DeleteQueueIntegrationService;
