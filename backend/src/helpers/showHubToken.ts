import Integration from "../models/Integration";

export const showHubToken = async (): Promise<string> => {
  // Prefer environment variable for security
  if (process.env.NOTIFICAME_HUB_TOKEN && process.env.NOTIFICAME_HUB_TOKEN !== "") {
    return process.env.NOTIFICAME_HUB_TOKEN;
  }

  // Fallback to stored integration only if env is not provided
  const hubToken = await Integration.findOne({
    where: { key: "hubToken" }
  });

  if (!hubToken) {
    throw new Error("Notificame Hub token not found. Set NOTIFICAME_HUB_TOKEN in env.");
  }

  return hubToken.value;
};
