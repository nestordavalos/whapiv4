import { Sequelize, Op, Filterable } from "sequelize";
import Contact from "../../models/Contact";
import ContactTag from "../../models/ContactTag";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  tags?: number[];
}

interface Response {
  contacts: Contact[];
  count: number;
  hasMore: boolean;
}

const ListContactsService = async ({
  searchParam = "",
  pageNumber = "1",
  tags
}: Request): Promise<Response> => {
  const sanitizedSearch = searchParam.toLowerCase().trim();
  const numericSearch = sanitizedSearch.replace(/\D/g, "");

  let whereCondition: Filterable["where"] = {
    [Op.or]: [
      {
        name: Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("name")),
          "LIKE",
          `%${sanitizedSearch}%`
        )
      },
      { number: { [Op.like]: `%${sanitizedSearch}%` } },
      // Also match pure digits regardless of formatting
      ...(numericSearch
        ? [{ number: { [Op.like]: `%${numericSearch}%` } }]
        : []),
      {
        email: Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("email")),
          "LIKE",
          `%${sanitizedSearch}%`
        )
      }
    ]
  };

  // Optimized: Single query instead of N queries for tags
  if (Array.isArray(tags) && tags.length > 0) {
    // Get all contact-tag associations in a single query
    const contactTags = await ContactTag.findAll({
      where: { tagId: { [Op.in]: tags } },
      attributes: ["contactId", "tagId"]
    });

    // Group contacts by tag in memory
    const contactsByTag = new Map<number, Set<number>>();
    contactTags.forEach(ct => {
      if (!contactsByTag.has(ct.tagId)) {
        contactsByTag.set(ct.tagId, new Set());
      }
      contactsByTag.get(ct.tagId)!.add(ct.contactId);
    });

    // Find intersection of contacts that have ALL specified tags
    let contactsIntersection: Set<number> | null = null;
    for (const [, contactIds] of contactsByTag) {
      if (contactsIntersection === null) {
        contactsIntersection = new Set(contactIds);
      } else {
        contactsIntersection = new Set(
          [...contactsIntersection].filter(id => contactIds.has(id))
        );
      }
    }

    const contactIdArray = contactsIntersection
      ? Array.from(contactsIntersection)
      : [];

    whereCondition = {
      id: {
        [Op.in]: contactIdArray.length > 0 ? contactIdArray : [-1] // -1 ensures no results if empty
      }
    };
  }

  const limit = 200;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: contacts } = await Contact.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    order: [["name", "ASC"]]
  });

  const hasMore = count > offset + contacts.length;

  return {
    contacts,
    count,
    hasMore
  };
};

export default ListContactsService;
