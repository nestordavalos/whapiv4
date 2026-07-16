import AppError from "../../errors/AppError";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import { getWhaileys, whaileysJid } from "../../libs/whaileys";
import { getZapo } from "../../libs/zapo";
import Whatsapp from "../../models/Whatsapp";
import { cacheLidPhoneMapping, isLikelyLid } from "../../helpers/GetContactJid";

const CheckIsValidContact = async (
  number: string,
  whatsappId?: number
): Promise<void> => {
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
    try {
      const [validNumber] = await getWhaileys(whatsapp.id).onWhatsApp(
        whaileysJid(number)
      );
      if (!validNumber?.exists) throw new Error("invalidNumber");
      return;
    } catch (err) {
      if ((err as Error).message === "invalidNumber") {
        throw new AppError("ERR_WAPP_INVALID_CONTACT");
      }
      throw new AppError("ERR_WAPP_CHECK_CONTACT");
    }
  }

  if (whatsapp.provider === "zapo") {
    try {
      const [result] = await getZapo(whatsapp.id).profile.getLidsByPhoneNumbers([
        number
      ]);
      if (!result?.exists || result.invalid) {
        throw new AppError("invalidNumber");
      }
      if (result.lidJid) {
        cacheLidPhoneMapping(result.lidJid.split("@")[0], result.phoneJid.split("@")[0]);
      }
      return;
    } catch (err) {
      if ((err as Error).message === "invalidNumber") {
        throw new AppError("ERR_WAPP_INVALID_CONTACT");
      }
      throw new AppError("ERR_WAPP_CHECK_CONTACT");
    }
  }

  const wbot = getWbot(whatsapp.id);

  try {
    const validNumber: any = await wbot.getNumberId(`${number}@c.us`);
    if (!validNumber) {
      throw new AppError("invalidNumber");
    }

    if (validNumber.server === "lid" || isLikelyLid(validNumber.user)) {
      cacheLidPhoneMapping(validNumber.user, number);
    }
  } catch (err) {
    if (err.message === "invalidNumber") {
      throw new AppError("ERR_WAPP_INVALID_CONTACT");
    }
    throw new AppError("ERR_WAPP_CHECK_CONTACT");
  }
};

export default CheckIsValidContact;
