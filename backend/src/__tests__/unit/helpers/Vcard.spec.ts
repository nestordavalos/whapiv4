import {
  normalizeVcardPhone,
  parseVcardContacts
} from "../../../helpers/Vcard";

describe("Vcard helper", () => {
  it("supports grouped properties and several numbers for one contact", () => {
    const contacts = parseVcardContacts(`BEGIN:VCARD
VERSION:3.0
FN:Ana
item1.TEL;TYPE=CELL;waid=595981111111:+595 981 111111
item1.X-ABLabel:Móvil
item2.TEL;TYPE=WORK:021 555555
item3.EMAIL:ana@example.com
END:VCARD`);

    expect(contacts).toEqual([
      {
        name: "Ana",
        phones: [
          { value: "595981111111", type: "Móvil" },
          { value: "021555555", type: "WORK" }
        ],
        emails: [{ value: "ana@example.com", type: "" }]
      }
    ]);
  });

  it("supports multiple cards, email-only contacts and Zapo display names", () => {
    const contacts = parseVcardContacts(
      `BEGIN:VCARD\r
VERSION:3.0\r
EMAIL:one@example.com\r
END:VCARD\r
BEGIN:VCARD\r
VERSION:3.0\r
TEL:+595981\r
 234567\r
END:VCARD`,
      "Nombre Zapo"
    );

    expect(contacts).toHaveLength(2);
    expect(contacts[0]).toMatchObject({
      name: "Nombre Zapo",
      phones: [],
      emails: [{ value: "one@example.com", type: "" }]
    });
    expect(contacts[1].phones[0].value).toBe("595981234567");
  });

  it("removes URI prefixes and extensions when normalizing numbers", () => {
    expect(normalizeVcardPhone("tel:+595-981-123456;ext=22")).toBe(
      "595981123456"
    );
  });
});
