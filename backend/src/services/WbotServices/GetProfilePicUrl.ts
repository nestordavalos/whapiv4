import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";

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

  const profilePicUrl = await wbot.getProfilePicUrl(`${number}@c.us`);

  return profilePicUrl;
};

export default GetProfilePicUrl;
