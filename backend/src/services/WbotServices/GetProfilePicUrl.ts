import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import { logger } from "../../utils/logger";
import { isLikelyLid } from "../../helpers/GetContactJid";

const DEFAULT_PROFILE_PIC = "/default-profile.png";

const GetProfilePicUrl = async (
  number: string,
  whatsappId?: number,
  isGroup = false
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

  // Groups use @g.us suffix — no LID resolution needed
  if (isGroup) {
    try {
      const profilePicUrl = await wbot.getProfilePicUrl(`${number}@g.us`);
      if (profilePicUrl) return profilePicUrl;
    } catch {
      // fall through to default
    }
    return DEFAULT_PROFILE_PIC;
  }

  // Strategy 1: Try using the library's getContactById which
  // internally resolves LID via WAWebContactSyncUtils (d6dfff2)
  try {
    const contact = await wbot.getContactById(`${number}@c.us`);
    if (contact) {
      const picUrl = await contact.getProfilePicUrl();
      if (picUrl) return picUrl;
    }
  } catch (err) {
    logger.debug(`Strategy 1 (getContactById) failed for ${number}: ${err.message}`);
  }

  // Strategy 2: Direct getProfilePicUrl with @c.us
  try {
    const profilePicUrl = await wbot.getProfilePicUrl(`${number}@c.us`);
    if (profilePicUrl) return profilePicUrl;
  } catch (err) {
    logger.debug(`Strategy 2 (direct @c.us) failed for ${number}: ${err.message}`);
  }

  // Strategy 3: If the number is a LID, try with @lid suffix
  if (isLikelyLid(number)) {
    try {
      const profilePicUrl = await wbot.getProfilePicUrl(`${number}@lid`);
      if (profilePicUrl) return profilePicUrl;
    } catch (err) {
      logger.debug(`Strategy 3 (@lid) failed for ${number}: ${err.message}`);
    }
  }

  logger.warn(`Could not get profile pic for ${number}, using default`);
  return DEFAULT_PROFILE_PIC;
};

export default GetProfilePicUrl;
