import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import { getWhaileys, whaileysJid } from "../../libs/whaileys";
import { getZapo } from "../../libs/zapo";
import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import { cacheLidPhoneMapping, isLikelyLid } from "../../helpers/GetContactJid";
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

  if (whatsapp.provider === "whaileys") {
    const [validNumber] = await getWhaileys(whatsapp.id).onWhatsApp(
      whaileysJid(number)
    );
    if (!validNumber?.exists) throw new AppError("ERR_WAPP_INVALID_CONTACT");
    return number;
  }

  if (whatsapp.provider === "zapo") {
    try {
      const [result] = await getZapo(whatsapp.id).profile.getLidsByPhoneNumbers([
        number
      ]);
      if (!result?.exists || result.invalid) {
        throw new AppError("ERR_WAPP_INVALID_CONTACT");
      }
      if (result.lidJid) {
        cacheLidPhoneMapping(result.lidJid.split("@")[0], result.phoneJid.split("@")[0]);
      }
      return result.phoneJid.split("@")[0];
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.warn({ whatsappId: whatsapp.id, number, err }, "Zapo contact validation failed");
      throw new AppError("ERR_WAPP_CHECK_CONTACT");
    }
  }

  const wbot = getWbot(whatsapp.id);

  const validNumber: any = await wbot.getNumberId(`${number}@c.us`);

  if (!validNumber) {
    throw new AppError("ERR_WAPP_INVALID_CONTACT");
  }

  // WhatsApp's LID migration can cause getNumberId to return a LID WID
  // instead of the phone WID. Since we KNOW the original number is valid
  // (QueryExist confirmed it), return the original number in that case.
  if (validNumber.server === "lid" || isLikelyLid(validNumber.user)) {
    cacheLidPhoneMapping(validNumber.user, number);
    logger.info(
      `CheckContactNumber: getNumberId returned LID ${validNumber.user} for phone ${number}, using original number`
    );
    return number;
  }

  return validNumber.user;
};

export default CheckContactNumber;
