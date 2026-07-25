const decodeQuotedPrintable = value => {
  if (!/=([0-9A-F]{2})/i.test(value)) return value;

  try {
    const encoded = value.replace(/=([0-9A-F]{2})/gi, "%$1");
    return decodeURIComponent(encoded);
  } catch {
    return value.replace(/=([0-9A-F]{2})/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
  }
};

const decodeText = (value, parameters = "") => {
  const decoded = /ENCODING=QUOTED-PRINTABLE/i.test(parameters)
    ? decodeQuotedPrintable(value)
    : value;

  return decoded
    .replace(/\\n/gi, "\n")
    .replace(/\\([\\,;:])/g, "$1")
    .trim();
};

const parseContentLine = line => {
  const separator = line.indexOf(":");
  if (separator === -1) return null;

  const descriptor = line.slice(0, separator);
  const value = line.slice(separator + 1);
  const [rawProperty, ...rawParameters] = descriptor.split(";");
  const propertyParts = rawProperty.split(".");
  const property = propertyParts.pop()?.toUpperCase();
  const group = propertyParts.join(".").toLowerCase();
  const parameters = rawParameters.join(";");
  const type =
    rawParameters
      .find(parameter => /^TYPE=/i.test(parameter))
      ?.replace(/^TYPE=/i, "")
      .replace(/^"|"$/g, "")
      .split(",")[0] ||
    rawParameters.find(parameter => !parameter.includes("=")) ||
    "";
  const waid =
    rawParameters
      .find(parameter => /^WAID=/i.test(parameter))
      ?.replace(/^WAID=/i, "") || "";

  return {
    group,
    property,
    parameters,
    type,
    waid,
    value: decodeText(value, parameters),
  };
};

const normalizePhone = value =>
  String(value || "")
    .replace(/^tel:/i, "")
    .split(/;ext=/i)[0]
    .replace(/\D/g, "");

const splitCards = body => {
  const unfolded = String(body || "")
    .replace(/=\r?\n/g, "")
    .replace(/\r?\n[ \t]/g, "")
    .trim();
  if (!unfolded) return [];
  return unfolded.match(/BEGIN:VCARD[\s\S]*?END:VCARD/gi) || [unfolded];
};

const getStructuredEntries = dataJson => {
  if (!dataJson) return [];

  try {
    const parsed = typeof dataJson === "string" ? JSON.parse(dataJson) : dataJson;
    return Array.isArray(parsed?.vcardContacts)
      ? parsed.vcardContacts.filter(entry => entry?.vcard || entry?.displayName)
      : [];
  } catch {
    return [];
  }
};

const parseCard = (card, fallbackName = "") => {
  const lines = String(card || "")
    .replace(/=\r?\n/g, "")
    .replace(/\r?\n[ \t]/g, "")
    .split(/\r?\n/)
    .map(parseContentLine)
    .filter(Boolean);
  const labels = new Map(
    lines
      .filter(line => line.property === "X-ABLABEL" && line.group)
      .map(line => [line.group, line.value])
  );
  const fullName = lines.find(line => line.property === "FN")?.value;
  const structuredName = lines
    .find(line => line.property === "N")
    ?.value.split(";")
    .filter(Boolean)
    .reverse()
    .join(" ");

  const phones = lines
    .filter(line => line.property === "TEL" && (line.value || line.waid))
    .map(line => ({
      value: (line.value || line.waid).replace(/^tel:/i, ""),
      normalized: normalizePhone(line.waid || line.value),
      type: labels.get(line.group) || line.type,
    }))
    .filter(
      (phone, index, all) =>
        phone.value &&
        all.findIndex(candidate =>
          phone.normalized
            ? candidate.normalized === phone.normalized
            : candidate.value === phone.value
        ) === index
    );

  const emails = lines
    .filter(line => line.property === "EMAIL" && line.value)
    .map(line => ({
      value: line.value.replace(/^mailto:/i, ""),
      type: labels.get(line.group) || line.type,
    }))
    .filter(
      (email, index, all) =>
        all.findIndex(
          candidate => candidate.value.toLowerCase() === email.value.toLowerCase()
        ) === index
    );

  return {
    name: fullName || fallbackName || structuredName || "Contacto",
    phones,
    emails,
  };
};

export const parseVcardContacts = (body, dataJson) => {
  const structuredEntries = getStructuredEntries(dataJson);
  const contacts = structuredEntries.length
    ? structuredEntries.flatMap(entry => {
        const cards = splitCards(entry.vcard);
        return cards.length
          ? cards.map(card => parseCard(card, entry.displayName))
          : [parseCard("", entry.displayName)];
      })
    : splitCards(body).map(card => parseCard(card));

  return contacts.length
    ? contacts
    : [{ name: "Contacto", phones: [], emails: [] }];
};

export const getVcardSummary = contacts => {
  const safeContacts = Array.isArray(contacts) ? contacts : [];
  const first = safeContacts[0] || {
    name: "Contacto",
    phones: [],
    emails: [],
  };
  const firstDetail = first.phones?.[0]?.value || first.emails?.[0]?.value || "";
  const totalPhones = safeContacts.reduce(
    (total, contact) => total + (contact.phones?.length || 0),
    0
  );

  return {
    name: first.name || "Contacto",
    detail: firstDetail,
    additionalContacts: Math.max(0, safeContacts.length - 1),
    additionalPhones: Math.max(0, totalPhones - (first.phones?.length ? 1 : 0)),
  };
};
