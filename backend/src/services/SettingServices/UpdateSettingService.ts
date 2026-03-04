import { hash } from "bcryptjs";
import AppError from "../../errors/AppError";
import Setting from "../../models/Setting";

interface Request {
  key: string;
  value: string;
}

const UpdateSettingService = async ({
  key,
  value
}: Request): Promise<Setting | undefined> => {
  const setting = await Setting.findOne({
    where: { key }
  });

  if (!setting) {
    throw new AppError("ERR_NO_SETTING_FOUND", 404);
  }

  // Hash API tokens before storing
  let storedValue = value;
  if (key === "userApiToken" && value) {
    storedValue = await hash(value, 10);
  }

  await setting.update({ value: storedValue });

  return setting;
};

export default UpdateSettingService;
