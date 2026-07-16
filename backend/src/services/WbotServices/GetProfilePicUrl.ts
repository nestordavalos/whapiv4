import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import { getZapo, resolveZapoRecipientJid } from "../../libs/zapo";
import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import { logger } from "../../utils/logger";
import { isLikelyLid } from "../../helpers/GetContactJid";

const DEFAULT_PROFILE_PIC = "/default-profile.png";

const getErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

const isKnownWhatsAppWebProfilePicError = (message: string): boolean =>
  message.includes("isNewsletter") ||
  message.includes("No LID for user") ||
  message.includes("Lid is missing in chat table") ||
  message.includes("commonGid");

const getProfilePicUrlDirect = async (
  wbot: any,
  contactId: string
): Promise<string | undefined> => {
  return wbot.pupPage.evaluate((id: string) => {
    const win = window as any;
    const widFactory = win.require("WAWebWidFactory");
    const profilePicBridge = win.require("WAWebContactProfilePicThumbBridge");
    const collections = win.require("WAWebCollections");
    const wid = widFactory.createWid(id);

    const getUrl = (profilePic: any) => {
      if (profilePic && profilePic.eurl) return profilePic.eurl;
      if (profilePic && profilePic.img) return profilePic.img;
      if (profilePic?.attributes?.eurl) return profilePic.attributes.eurl;
      if (profilePic?.attributes?.img) return profilePic.attributes.img;
      return undefined;
    };

    const findProfilePicThumb = () => {
      const cachedThumb =
        collections.ProfilePicThumb.get(id) ||
        collections.ProfilePicThumb.get(wid);
      const cachedUrl = getUrl(cachedThumb);
      if (cachedUrl) return Promise.resolve(cachedUrl);

      return collections.ProfilePicThumb.find(wid)
        .catch(() => undefined)
        .then((thumbByWid: any) => {
          const thumbByWidUrl = getUrl(thumbByWid);
          if (thumbByWidUrl) return thumbByWidUrl;

          return collections.ProfilePicThumb.find(id)
            .catch(() => undefined)
            .then((thumbById: any) => getUrl(thumbById));
        });
    };

    const findChatOrContactModel = () => {
      const cachedModel =
        collections.Chat.get(wid) ||
        collections.Chat.get(id) ||
        collections.Contact.get(wid) ||
        collections.Contact.get(id);

      if (cachedModel) return Promise.resolve(cachedModel);

      return collections.Chat.find(wid)
        .catch(() => undefined)
        .then((chatModel: any) => {
          if (chatModel) return chatModel;

          return collections.Contact.find(wid).catch(() => undefined);
        });
    };

    return findChatOrContactModel()
      .then((model: any) => {
        if (!model) return findProfilePicThumb();

        return profilePicBridge
          .requestProfilePicFromServer(model)
          .then((profilePic: any) => getUrl(profilePic))
          .catch(() => undefined)
          .then((profilePicUrl: string | undefined) => {
            return profilePicUrl || findProfilePicThumb();
          });
      })
      .catch(() => findProfilePicThumb());
  }, contactId);
};

const getProfilePicFromCandidates = async (
  wbot: any,
  candidates: string[]
): Promise<string | undefined> => {
  for (const candidate of candidates) {
    try {
      const profilePicUrl = await getProfilePicUrlDirect(wbot, candidate);
      if (profilePicUrl) return profilePicUrl;
    } catch (err) {
      const errMsg = getErrorMessage(err);
      if (isKnownWhatsAppWebProfilePicError(errMsg)) {
        logger.debug(`Direct profile pic failed for ${candidate}: ${errMsg}`);
      } else {
        logger.debug(
          `Direct profile pic unexpected failure for ${candidate}: ${errMsg}`
        );
      }
    }
  }

  return undefined;
};

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

  if (whatsapp.provider === "zapo") {
    try {
      const picture = await getZapo(whatsapp.id).profile.getProfilePicture(
        await resolveZapoRecipientJid(whatsapp.id, number, isGroup),
        "image"
      );
      return picture?.url || DEFAULT_PROFILE_PIC;
    } catch {
      return DEFAULT_PROFILE_PIC;
    }
  }

  const wbot = getWbot(whatsapp.id);

  // Groups use @g.us suffix — no LID resolution needed
  if (isGroup) {
    try {
      const profilePicUrl =
        (await getProfilePicFromCandidates(wbot, [`${number}@g.us`])) ||
        (await wbot.getProfilePicUrl(`${number}@g.us`));
      if (profilePicUrl) return profilePicUrl;
    } catch {
      // fall through to default
    }
    return DEFAULT_PROFILE_PIC;
  }

  const candidates = [`${number}@c.us`];
  if (isLikelyLid(number)) {
    candidates.unshift(`${number}@lid`);
  } else {
    candidates.push(`${number}@lid`);
  }

  const directProfilePicUrl = await getProfilePicFromCandidates(
    wbot,
    candidates
  );
  if (directProfilePicUrl) return directProfilePicUrl;

  // Strategy 1: Try using the library's getContactById which
  // internally resolves LID via WAWebContactSyncUtils (d6dfff2)
  try {
    const contact = await wbot.getContactById(`${number}@c.us`);
    if (contact) {
      const picUrl = await contact.getProfilePicUrl();
      if (picUrl) return picUrl;
    }
  } catch (err) {
    const errMsg = getErrorMessage(err);
    if (isKnownWhatsAppWebProfilePicError(errMsg)) {
      logger.debug(
        `Profile pic unavailable for ${number} due to WhatsApp Web internals, using default`
      );
    } else {
      logger.debug(
        `Strategy 1 (getContactById) failed for ${number}: ${errMsg}`
      );
    }
  }

  // Strategy 2: Direct getProfilePicUrl with @c.us
  try {
    const profilePicUrl = await wbot.getProfilePicUrl(`${number}@c.us`);
    if (profilePicUrl) return profilePicUrl;
  } catch (err) {
    const errMsg = getErrorMessage(err);
    if (isKnownWhatsAppWebProfilePicError(errMsg)) {
      logger.debug(
        `Profile pic unavailable for ${number} due to WhatsApp Web internals, using default`
      );
    } else {
      logger.debug(`Strategy 2 (direct @c.us) failed for ${number}: ${errMsg}`);
    }
  }

  // Strategy 3: If the number is a LID, try with @lid suffix
  if (isLikelyLid(number)) {
    try {
      const profilePicUrl = await wbot.getProfilePicUrl(`${number}@lid`);
      if (profilePicUrl) return profilePicUrl;
    } catch (err) {
      const errMsg = getErrorMessage(err);
      logger.debug(`Strategy 3 (@lid) failed for ${number}: ${errMsg}`);
    }
  }

  logger.warn(`Could not get profile pic for ${number}, using default`);
  return DEFAULT_PROFILE_PIC;
};

export default GetProfilePicUrl;
