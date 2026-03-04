import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import { logger } from "../../utils/logger";

const DEFAULT_PROFILE_PIC = "/default-profile.png";

const GetProfilePicUrl = async (
  number: string,
  whatsappId?: number
): Promise<string> => {
  let whatsapp: Whatsapp | null;

  if (whatsappId) {
    whatsapp = await Whatsapp.findByPk(whatsappId);
    if (!whatsapp) {
      throw new AppError(`WhatsApp connection #${whatsappId} not found`, 404);
    }
  } else {
    whatsapp = await GetDefaultWhatsApp();
  }

  const wbot = getWbot(whatsapp.id);

  try {
    const profilePicUrl = await wbot.getProfilePicUrl(`${number}@c.us`);
    return profilePicUrl || DEFAULT_PROFILE_PIC;
  } catch (err) {
    logger.warn(
      `Could not get profile pic for ${number}: ${err.message}`
    );
    return DEFAULT_PROFILE_PIC;
  }
};

export default GetProfilePicUrl;
