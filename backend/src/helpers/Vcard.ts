export interface ParsedVcardField {
  value: string;
  type: string;
}

export interface ParsedVcardContact {
  name: string;
  phones: ParsedVcardField[];
  emails: ParsedVcardField[];
}

interface ContentLine {
  group: string;
  property: string;
  parameters: string[];
  value: string;
}

const unfold = (value: string): string =>
  String(value || "")
    .replace(/=\r?\n/g, "")
    .replace(/\r?\n[ \t]/g, "");

const decodeText = (value: string): string =>
  value
    .replace(/\\n/gi, "\n")
    .replace(/\\([\\,;:])/g, "$1")
    .trim();

const parseContentLine = (line: string): ContentLine | null => {
  const separator = line.indexOf(":");
  if (separator === -1) return null;

  const descriptor = line.slice(0, separator);
  const [rawProperty, ...parameters] = descriptor.split(";");
  const propertyParts = rawProperty.split(".");
  const property = propertyParts.pop()?.toUpperCase();
  if (!property) return null;

  return {
    group: propertyParts.join(".").toLowerCase(),
    property,
    parameters,
    value: decodeText(line.slice(separator + 1))
  };
};

const getType = (line: ContentLine, labels: Map<string, string>): string =>
  labels.get(line.group) ||
  line.parameters
    .find(parameter => /^TYPE=/i.test(parameter))
    ?.replace(/^TYPE=/i, "")
    .replace(/^"|"$/g, "")
    .split(",")[0] ||
  line.parameters.find(parameter => !parameter.includes("=")) ||
  "";

const getWaid = (line: ContentLine): string =>
  line.parameters
    .find(parameter => /^WAID=/i.test(parameter))
    ?.replace(/^WAID=/i, "") || "";

export const normalizeVcardPhone = (value: string): string =>
  String(value || "")
    .replace(/^tel:/i, "")
    .split(/;ext=/i)[0]
    .replace(/\D/g, "");

const parseCard = (card: string, fallbackName = ""): ParsedVcardContact => {
  const lines = unfold(card)
    .split(/\r?\n/)
    .map(parseContentLine)
    .filter((line): line is ContentLine => Boolean(line));
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
    .filter(
      line => line.property === "TEL" && Boolean(line.value || getWaid(line))
    )
    .map(line => ({
      value: normalizeVcardPhone(getWaid(line) || line.value),
      type: getType(line, labels)
    }))
    .filter(
      (phone, index, all) =>
        phone.value.length >= 6 &&
        all.findIndex(candidate => candidate.value === phone.value) === index
    );
  const emails = lines
    .filter(line => line.property === "EMAIL" && line.value)
    .map(line => ({
      value: line.value.replace(/^mailto:/i, ""),
      type: getType(line, labels)
    }))
    .filter(
      (email, index, all) =>
        all.findIndex(
          candidate =>
            candidate.value.toLowerCase() === email.value.toLowerCase()
        ) === index
    );

  return {
    name: fullName || fallbackName || structuredName || "Contacto",
    phones,
    emails
  };
};

export const parseVcardContacts = (
  vcard: string,
  fallbackName = ""
): ParsedVcardContact[] => {
  const body = unfold(vcard).trim();
  if (!body) {
    return fallbackName ? [{ name: fallbackName, phones: [], emails: [] }] : [];
  }

  const cards = body.match(/BEGIN:VCARD[\s\S]*?END:VCARD/gi) || [body];
  return cards.map(card => parseCard(card, fallbackName));
};
