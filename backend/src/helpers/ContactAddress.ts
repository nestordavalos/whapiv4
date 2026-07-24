/** Makes the business phone and WhatsApp transport LID explicit in APIs. */
export const serializeContactAddress = <T extends Record<string, any>>(
  value: T
): T & { phoneNumber: string; lidJid: string | null } => {
  const contact = typeof value?.toJSON === "function" ? value.toJSON() : value;
  const remoteJid = String(contact?.remoteJid || "");
  return {
    ...contact,
    phoneNumber: String(contact?.number || ""),
    lidJid: remoteJid.endsWith("@lid") ? remoteJid : null
  };
};
