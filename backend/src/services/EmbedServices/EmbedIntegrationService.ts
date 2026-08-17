import { randomUUID } from "crypto";
import EmbedIntegration from "../../models/EmbedIntegration";
import User from "../../models/User";
import AppError from "../../errors/AppError";
import {
  createEmbedToken,
  getPublicBackendUrl,
  normalizeEmbedPath,
  normalizeOrigins
} from "./EmbedSecurity";

interface IntegrationInput {
  name: string;
  allowedOrigins: unknown;
  defaultPath?: string;
  userId: number;
  enabled?: boolean;
}

const includeUser = [
  { model: User, as: "user", attributes: ["id", "name", "email", "profile"] }
];

export const serializeIntegration = (integration: EmbedIntegration) => {
  const token = createEmbedToken(
    integration.publicId,
    integration.secretVersion
  );
  const embedUrl = `${getPublicBackendUrl()}/embed/${
    integration.publicId
  }#token=${token}`;
  return {
    ...integration.toJSON(),
    publicId: integration.publicId,
    token,
    embedUrl
  };
};

const validateInput = async (input: IntegrationInput) => {
  const name = String(input.name || "").trim();
  if (!name || name.length > 120)
    throw new AppError("ERR_INVALID_EMBED_NAME", 400);

  const user = await User.findByPk(Number(input.userId));
  if (!user) throw new AppError("ERR_NO_USER_FOUND", 404);

  return {
    name,
    allowedOrigins: normalizeOrigins(input.allowedOrigins),
    defaultPath: normalizeEmbedPath(input.defaultPath),
    userId: user.id,
    enabled: input.enabled !== false
  };
};

export const listIntegrations = async () => {
  const integrations = await EmbedIntegration.findAll({
    include: includeUser,
    order: [["createdAt", "DESC"]]
  });
  return integrations.map(serializeIntegration);
};

export const createIntegration = async (
  input: IntegrationInput,
  createdBy: number
) => {
  const values = await validateInput(input);
  const integration = await EmbedIntegration.create({
    ...values,
    publicId: randomUUID(),
    secretVersion: randomUUID(),
    createdBy
  } as EmbedIntegration);
  await integration.reload({ include: includeUser });
  return serializeIntegration(integration);
};

export const updateIntegration = async (
  id: number,
  input: IntegrationInput
) => {
  const integration = await EmbedIntegration.findByPk(id);
  if (!integration) throw new AppError("ERR_EMBED_INTEGRATION_NOT_FOUND", 404);
  const values = await validateInput(input);
  await integration.update({ ...values, secretVersion: randomUUID() });
  await integration.reload({ include: includeUser });
  return serializeIntegration(integration);
};

export const rotateIntegration = async (id: number) => {
  const integration = await EmbedIntegration.findByPk(id);
  if (!integration) throw new AppError("ERR_EMBED_INTEGRATION_NOT_FOUND", 404);
  await integration.update({ secretVersion: randomUUID() });
  await integration.reload({ include: includeUser });
  return serializeIntegration(integration);
};

export const removeIntegration = async (id: number): Promise<string> => {
  const integration = await EmbedIntegration.findByPk(id);
  if (!integration) throw new AppError("ERR_EMBED_INTEGRATION_NOT_FOUND", 404);
  await integration.destroy();
  return integration.publicId;
};
