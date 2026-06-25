import AppError from "../../errors/AppError";
import Setting from "../../models/Setting";

interface Request {
  key: string;
}

const CACHE_TTL_MS = Number(process.env.SETTINGS_CACHE_TTL_MS || 30000);
const settingsCache = new Map<
  string,
  { expiresAt: number; setting: Setting }
>();

export const invalidateSettingCache = (key?: string): void => {
  if (key) {
    settingsCache.delete(key);
    return;
  }

  settingsCache.clear();
};

const ListSettingsServiceOne = async ({
  key
}: Request): Promise<Setting | undefined> => {
  const cached = settingsCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.setting;
  }

  const setting = await Setting.findOne({
    where: { key }
  });

  if (!setting) {
    throw new AppError("ERR_NO_SETTING_FOUND", 404);
  }

  if (CACHE_TTL_MS > 0) {
    settingsCache.set(key, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      setting
    });
  }

  return setting;
};

export default ListSettingsServiceOne;
