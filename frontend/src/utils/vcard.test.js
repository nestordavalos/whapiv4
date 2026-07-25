import { describe, expect, it } from "vitest";
import { getVcardSummary, parseVcardContacts } from "./vcard";

describe("parseVcardContacts", () => {
  it("parses grouped fields and multiple phones and emails", () => {
    const contacts = parseVcardContacts(`BEGIN:VCARD
VERSION:3.0
FN:Ana Pérez
item1.TEL;TYPE=CELL;waid=595981111111:+595 981 111111
item1.X-ABLabel:Móvil
item2.TEL;TYPE=WORK:021 555555
item3.EMAIL;TYPE=WORK:ana@example.com
item4.EMAIL:personal@example.com
END:VCARD`);

    expect(contacts).toEqual([
      {
        name: "Ana Pérez",
        phones: [
          {
            value: "+595 981 111111",
            normalized: "595981111111",
            type: "Móvil",
          },
          { value: "021 555555", normalized: "021555555", type: "WORK" },
        ],
        emails: [
          { value: "ana@example.com", type: "WORK" },
          { value: "personal@example.com", type: "" },
        ],
      },
    ]);
  });

  it("parses multiple cards and accepts an email-only contact", () => {
    const contacts = parseVcardContacts(`BEGIN:VCARD
VERSION:3.0
FN:Solo Email
EMAIL:email@example.com
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Con Teléfono
TEL:0981 222333
END:VCARD`);

    expect(contacts).toHaveLength(2);
    expect(contacts[0].phones).toEqual([]);
    expect(contacts[0].emails[0].value).toBe("email@example.com");
    expect(contacts[1].phones[0].normalized).toBe("0981222333");
  });

  it("uses Zapo displayName metadata and unfolds continued lines", () => {
    const dataJson = JSON.stringify({
      vcardContacts: [
        {
          displayName: "Nombre de Zapo",
          vcard: "BEGIN:VCARD\r\nVERSION:3.0\r\nitem1.TEL:+595981\r\n 234567\r\nEND:VCARD",
        },
      ],
    });

    const contacts = parseVcardContacts("", dataJson);

    expect(contacts[0].name).toBe("Nombre de Zapo");
    expect(contacts[0].phones[0].normalized).toBe("595981234567");
  });

  it("returns a safe placeholder for empty or malformed content", () => {
    expect(parseVcardContacts("")).toEqual([
      { name: "Contacto", phones: [], emails: [] },
    ]);
  });
});

describe("getVcardSummary", () => {
  it("summarizes additional contacts and phone numbers", () => {
    expect(
      getVcardSummary([
        {
          name: "Ana",
          phones: [{ value: "1" }, { value: "2" }],
          emails: [],
        },
        { name: "Luis", phones: [{ value: "3" }], emails: [] },
      ])
    ).toMatchObject({
      name: "Ana",
      detail: "1",
      additionalContacts: 1,
      additionalPhones: 2,
    });
  });
});

