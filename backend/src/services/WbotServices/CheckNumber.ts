import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import { isLikelyLid } from "../../helpers/GetContactJid";
import { logger } from "../../utils/logger";

const CheckContactNumber = async (
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

  const validNumber: any = await wbot.getNumberId(`${number}@c.us`);

  if (!validNumber) {
    throw new AppError("ERR_WAPP_INVALID_CONTACT");
  }

  // WhatsApp's LID migration can cause getNumberId to return a LID WID
  // instead of the phone WID. Since we KNOW the original number is valid
  // (QueryExist confirmed it), return the original number in that case.
  if (
    validNumber.server === "lid" ||
    isLikelyLid(validNumber.user)
  ) {
    logger.info(
      `CheckContactNumber: getNumberId returned LID ${validNumber.user} for phone ${number}, using original number`
    );
    return number;
  }

  return validNumber.user;
};

export default CheckContactNumber;
