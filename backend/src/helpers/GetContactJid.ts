import { Client } from "whatsapp-web.js";
import { logger } from "../utils/logger";

/**
 * Maximum length for a valid international phone number (E.164 format).
 * Numbers longer than this are likely LID identifiers, not phone numbers.
 */
const MAX_PHONE_NUMBER_LENGTH = 15;

/**
 * In-memory cache for resolved LID → phone mappings.
 * Avoids repeated browser evaluate calls for the same LID.
 */
const lidPhoneCache = new Map<string, string>();
const phoneLidCache = new Map<string, string>();

const jidUser = (value?: string | null): string | null => {
  if (!value) return null;
  return value.split("@")[0].replace(/\D/g, "");
};

export const cacheLidPhoneMapping = (
  lidValue?: string | null,
  phoneValue?: string | null
): void => {
  const lidNumber = jidUser(lidValue);
  const phoneNumber = jidUser(phoneValue);

  if (
    !lidNumber ||
    !phoneNumber ||
    !isLikelyLid(lidNumber) ||
    isLikelyLid(phoneNumber)
  ) {
    return;
  }

  lidPhoneCache.set(lidNumber, phoneNumber);
  phoneLidCache.set(phoneNumber, lidNumber);
};

/**
 * Checks if a number string looks like a WhatsApp LID rather than a phone number.
 * LIDs are typically longer numeric strings that don't follow phone number patterns.
 */
export const isLikelyLid = (number: string): boolean => {
  if (!number) return false;
  const digits = number.replace(/\D/g, "");
  return digits.length > MAX_PHONE_NUMBER_LENGTH;
};

/**
 * Builds the correct remote JID for sending messages to a contact.
 *
 * Handles the WhatsApp LID migration:
 * - For group conversations → number@g.us
 * - For normal phone numbers → number@c.us
 * - For LID-like numbers (>15 digits) → number@lid
 */
export const getContactJid = (
  number: string,
  isGroup: boolean
): string => {
  if (isGroup) {
    return `${number}@g.us`;
  }

  if (isLikelyLid(number)) {
    return `${number}@lid`;
  }

  return `${number}@c.us`;
};

/**
 * Resolves the real phone number from a LID using multiple strategies
 * in order of speed/reliability:
 *
 * 0. In-memory cache (instant, no browser call)
 * 1. Store.LidUtils.getPhoneNumber — local WA cache lookup
 * 2. Contact.get + phoneNumber/ContactMethods — fast local read
 * 3. enforceLidAndPnRetrieval — server-side QueryExist (asks WA servers)
 * 4. Direct QueryExist + re-read LidUtils cache
 * 5. Contact.find (async server fetch) + phoneNumber/getUserid
 *
 * NOTE: The updated whatsapp-web.js library (d6dfff2) already uses
 * WAWebContactSyncUtils for LID resolution in getChat/getContact.
 * This function is a safety net for verifyContact (DB storage) where
 * the library's getContact can still return LID as Contact.number
 * when contact.phoneNumber is undefined.
 *
 * Returns the phone number string or null if ALL strategies fail.
 */
export const resolvePhoneFromLid = async (
  wbot: Client,
  lidNumber: string
): Promise<string | null> => {
  // Strategy 0: Check in-memory cache
  const cached = lidPhoneCache.get(lidNumber);
  if (cached) {
    return cached;
  }

  try {
    const result = await (wbot as any).pupPage.evaluate(async (lid: string) => {
      try {
        const win = window as any;
        if (!win.Store || !win.Store.WidFactory) {
          return null;
        }

        const wid = win.Store.WidFactory.createWid(`${lid}@lid`);

        // Strategy 1: LidUtils.getPhoneNumber — fast local cache lookup
        if (win.Store.LidUtils) {
          try {
            const phone = win.Store.LidUtils.getPhoneNumber(wid);
            if (phone && phone.user) {
              return { phone: phone.user, strategy: "LidUtils" };
            }
          } catch {
            // continue to next strategy
          }
        }

        // Strategy 2: Contact model phoneNumber (fast, no network)
        if (win.Store.Contact) {
          try {
            const contact = win.Store.Contact.get(wid);
            if (contact) {
              if (contact.phoneNumber && contact.phoneNumber.user) {
                return { phone: contact.phoneNumber.user, strategy: "Contact.phoneNumber" };
              }
              if (win.Store.ContactMethods) {
                const userid = win.Store.ContactMethods.getUserid(contact);
                if (userid && userid.length <= 15) {
                  return { phone: userid, strategy: "ContactMethods.getUserid" };
                }
              }
            }
          } catch {
            // continue to next strategy
          }
        }

        // Strategy 3: enforceLidAndPnRetrieval — server-side QueryExist
        if (typeof win.WWebJS?.enforceLidAndPnRetrieval === "function") {
          try {
            const resolved = await win.WWebJS.enforceLidAndPnRetrieval(
              `${lid}@lid`
            );
            if (resolved?.phone) {
              const phoneUser =
                resolved.phone.user ||
                resolved.phone._serialized?.replace("@c.us", "");
              if (phoneUser) {
                return { phone: phoneUser, strategy: "enforceLidAndPnRetrieval" };
              }
            }
          } catch {
            // continue
          }
        }

        // Strategy 4: Direct QueryExist + re-read LidUtils
        if (win.Store.QueryExist) {
          try {
            const queryResult = await win.Store.QueryExist(wid);
            if (queryResult?.wid) {
              if (win.Store.LidUtils) {
                const phone = win.Store.LidUtils.getPhoneNumber(wid);
                if (phone && phone.user) {
                  return { phone: phone.user, strategy: "QueryExist+LidUtils" };
                }
              }
              if (
                queryResult.wid.user &&
                queryResult.wid.server === "c.us"
              ) {
                return { phone: queryResult.wid.user, strategy: "QueryExist.wid" };
              }
            }
          } catch {
            // all strategies exhausted
          }
        }

        // Strategy 5: Full Contact.find (async server fetch) + read phoneNumber
        if (win.Store.Contact) {
          try {
            const contact = await win.Store.Contact.find(wid);
            if (contact) {
              if (contact.phoneNumber && contact.phoneNumber.user) {
                return { phone: contact.phoneNumber.user, strategy: "Contact.find.phoneNumber" };
              }
              if (win.Store.ContactMethods) {
                const userid = win.Store.ContactMethods.getUserid(contact);
                if (userid && userid.length <= 15) {
                  return { phone: userid, strategy: "Contact.find.getUserid" };
                }
              }
            }
          } catch {
            // contact find failed
          }
        }

        return null;
      } catch {
        return null;
      }
    }, lidNumber);

    if (result && result.phone) {
      // Validate: the resolved phone should look like a real phone number
      const phone = result.phone.replace(/\D/g, "");
      if (phone.length > 0 && phone.length <= MAX_PHONE_NUMBER_LENGTH) {
        logger.info(
          `Resolved LID ${lidNumber} → phone ${phone} (via ${result.strategy})`
        );
        cacheLidPhoneMapping(lidNumber, phone);
        return phone;
      }
      logger.warn(
        `Resolved LID ${lidNumber} but result "${result.phone}" doesn't look like a phone number`
      );
    }

    return null;
  } catch (err: any) {
    logger.warn(
      `Failed to resolve phone from LID ${lidNumber}: ${err.message}`
    );
    return null;
  }
};

export const resolveLidFromPhone = async (
  wbot: Client,
  phoneNumber: string
): Promise<string | null> => {
  const normalizedPhone = jidUser(phoneNumber);
  if (!normalizedPhone || isLikelyLid(normalizedPhone)) {
    return null;
  }

  const cached = phoneLidCache.get(normalizedPhone);
  if (cached) {
    return cached;
  }

  try {
    const mappings = await (wbot as any).getContactLidAndPhone([
      `${normalizedPhone}@c.us`
    ]);
    const mapping = Array.isArray(mappings) ? mappings[0] : null;
    if (mapping?.lid && mapping?.pn) {
      cacheLidPhoneMapping(mapping.lid, mapping.pn);
      const lidNumber = jidUser(mapping.lid);
      if (lidNumber && isLikelyLid(lidNumber)) {
        logger.info(
          `Resolved phone ${normalizedPhone} → LID ${lidNumber} (via getContactLidAndPhone)`
        );
        return lidNumber;
      }
    }
  } catch (err: any) {
    logger.debug(
      `getContactLidAndPhone failed for ${normalizedPhone}: ${err.message}`
    );
  }

  try {
    const result = await (wbot as any).pupPage.evaluate(
      async (phone: string) => {
        try {
          const resolved = await (window as any).WWebJS
            ?.enforceLidAndPnRetrieval(`${phone}@c.us`);
          return {
            lid: resolved?.lid?._serialized,
            pn: resolved?.phone?._serialized
          };
        } catch {
          return null;
        }
      },
      normalizedPhone
    );

    if (result?.lid && result?.pn) {
      cacheLidPhoneMapping(result.lid, result.pn);
      const lidNumber = jidUser(result.lid);
      if (lidNumber && isLikelyLid(lidNumber)) {
        logger.info(
          `Resolved phone ${normalizedPhone} → LID ${lidNumber} (via enforceLidAndPnRetrieval)`
        );
        return lidNumber;
      }
    }
  } catch (err: any) {
    logger.debug(
      `Browser LID lookup failed for ${normalizedPhone}: ${err.message}`
    );
  }

  return null;
};

/**
 * Returns the current LID→phone cache (useful for diagnostics).
 */
export const getLidPhoneCache = (): Map<string, string> => lidPhoneCache;

export const getPhoneLidCache = (): Map<string, string> => phoneLidCache;

/**
 * Clears entries from the LID→phone cache.
 */
export const clearLidPhoneCache = (): void => {
  lidPhoneCache.clear();
  phoneLidCache.clear();
};

/**
 * Attempts to send a message, falling back to @lid format if @c.us fails
 * with LID-related errors.
 *
 * NOTE: Since whatsapp-web.js d6dfff2, the library's getChat() already
 * resolves LID via WAWebContactSyncUtils internally. This fallback is
 * a safety net for edge cases where the library's resolution fails.
 *
 * Flow:
 * 1. If the number is a LID, try to resolve it to a real phone first
 * 2. Send via the resolved phone (@c.us) or the original JID
 * 3. If send fails or returns undefined, try the alternate JID format
 */
export const sendMessageWithLidFallback = async (
  wbot: Client,
  number: string,
  isGroup: boolean,
  content: any,
  options?: any
): Promise<any> => {
  // If the stored number looks like a LID, try to resolve to real phone first
  let resolvedNumber = number;
  if (!isGroup && isLikelyLid(number)) {
    try {
      const realPhone = await resolvePhoneFromLid(wbot, number);
      if (realPhone) {
        logger.info(
          `[sendMessageWithLidFallback] Resolved LID ${number} → ${realPhone} before sending`
        );
        resolvedNumber = realPhone;
      }
    } catch (resolveErr: any) {
      logger.warn(
        `[sendMessageWithLidFallback] Could not resolve LID ${number}: ${resolveErr.message}`
      );
    }
  }

  const primaryJid = getContactJid(resolvedNumber, isGroup);

  try {
    const sentMessage = await wbot.sendMessage(primaryJid, content, options);

    // The library can return undefined/null when the chat isn't found
    if (!sentMessage) {
      throw new Error(
        `sendMessage returned empty result for ${primaryJid}`
      );
    }
    return sentMessage;
  } catch (err: any) {
    const errMsg = err?.message || String(err);

    // Try alternate JID formats as fallback
    if (!isGroup) {
      const fallbackJids: string[] = [];

      // If we sent to @c.us (resolved phone), try the original LID @lid
      if (primaryJid.endsWith("@c.us") && resolvedNumber !== number) {
        fallbackJids.push(`${number}@lid`);
      }
      // If we sent to @lid (couldn't resolve), try @c.us with raw number
      else if (primaryJid.endsWith("@lid")) {
        fallbackJids.push(`${number}@c.us`);
      }
      // If @c.us failed with LID errors, try the real LID mapped to this phone.
      else if (
        !primaryJid.endsWith("@lid") &&
        (errMsg.includes("No LID for user") ||
          errMsg.includes("Lid is missing in chat table") ||
          errMsg.includes("isNewsletter") ||
          errMsg.includes("commonGid") ||
          errMsg.includes("returned empty result"))
      ) {
        const lidNumber = await resolveLidFromPhone(wbot, resolvedNumber);
        if (lidNumber) {
          fallbackJids.push(`${lidNumber}@lid`);
        }
      }

      for (const fallbackJid of fallbackJids) {
        try {
          logger.warn(
            `[sendMessageWithLidFallback] Primary ${primaryJid} failed, trying fallback ${fallbackJid}`
          );
          const sentMessage = await wbot.sendMessage(
            fallbackJid,
            content,
            options
          );
          if (sentMessage) {
            return sentMessage;
          }
        } catch (fallbackErr: any) {
          logger.warn(
            `[sendMessageWithLidFallback] Fallback ${fallbackJid} also failed: ${fallbackErr.message}`
          );
        }
      }
    }

    throw err;
  }
};
