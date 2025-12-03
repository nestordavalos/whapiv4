import * as Yup from "yup";
import AppError from "../../errors/AppError";
import QueueIntegrations from "../../models/QueueIntegrations";

interface Request {
  name: string;
  typebotUrl?: string;
  typebotSlug?: string;
  typebotExpires?: number;
  typebotKeywordFinish?: string;
  typebotKeywordRestart?: string;
  typebotUnknownMessage?: string;
  typebotRestartMessage?: string;
  typebotDelayMessage?: number;
}

const CreateQueueIntegrationService = async ({
  name,
  typebotUrl,
  typebotSlug,
  typebotExpires,
  typebotKeywordFinish,
  typebotKeywordRestart,
  typebotUnknownMessage,
  typebotRestartMessage,
  typebotDelayMessage
}: Request): Promise<QueueIntegrations> => {
  const schema = Yup.object().shape({
    name: Yup.string()
      .required()
      .min(2)
      .test(
        "Check-name",
        "Este nombre de integración ya está en uso.",
        async value => {
          if (!value) return false;
          const nameExists = await QueueIntegrations.findOne({
            where: { name: value }
          });
          return !nameExists;
        }
      )
  });

  try {
    await schema.validate({ name });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const queueIntegration = await QueueIntegrations.create({
    type: "typebot",
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

  return queueIntegration;
};

export default CreateQueueIntegrationService;
