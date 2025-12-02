import * as Yup from "yup";
import AppError from "../../errors/AppError";
import QueueIntegrations from "../../models/QueueIntegrations";
import ShowQueueIntegrationService from "./ShowQueueIntegrationService";

interface IntegrationData {
  name?: string;
  typebotUrl?: string;
  typebotSlug?: string;
  typebotExpires?: number;
  typebotKeywordFinish?: string;
  typebotKeywordRestart?: string;
  typebotUnknownMessage?: string;
  typebotRestartMessage?: string;
  typebotDelayMessage?: number;
}

interface Request {
  integrationData: IntegrationData;
  integrationId: string | number;
}

const UpdateQueueIntegrationService = async ({
  integrationData,
  integrationId
}: Request): Promise<QueueIntegrations> => {
  const schema = Yup.object().shape({
    name: Yup.string().min(2)
  });

  const {
    name,
    typebotUrl,
    typebotSlug,
    typebotExpires,
    typebotKeywordFinish,
    typebotKeywordRestart,
    typebotUnknownMessage,
    typebotRestartMessage,
    typebotDelayMessage
  } = integrationData;

  try {
    await schema.validate({ name });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const integration = await ShowQueueIntegrationService(integrationId);

  await integration.update({
    name,
    typebotUrl,
    typebotSlug,
    typebotExpires,
    typebotKeywordFinish,
    typebotKeywordRestart,
    typebotUnknownMessage,
    typebotRestartMessage,
    typebotDelayMessage
  });

  return integration;
};

export default UpdateQueueIntegrationService;
