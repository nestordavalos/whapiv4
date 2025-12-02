import { QueryInterface } from "sequelize";

/**
 * Performance optimization indexes migration
 *
 * This migration adds composite indexes and individual indexes
 * optimized for the most common queries in the application.
 *
 * Key optimizations:
 * 1. Composite indexes for multi-column WHERE clauses
 * 2. Covering indexes for frequent lookups
 * 3. Indexes for JOIN operations
 * 4. Indexes for ORDER BY optimization
 */
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // ============================================
    // TICKETS TABLE - Most critical table
    // ============================================

    // Composite index for FindOrCreateTicketService - most frequent query
    // Query: WHERE status IN ('open', 'pending') AND contactId = ? AND whatsappId = ?
    await queryInterface
      .addIndex("Tickets", ["status", "contactId", "whatsappId"], {
        name: "idx_tickets_status_contact_whatsapp"
      })
      .catch(() =>
        console.log("Index idx_tickets_status_contact_whatsapp already exists")
      );

    // Composite index for ticket listing with time filter
    // Query: WHERE contactId = ? AND whatsappId = ? ORDER BY updatedAt DESC
    await queryInterface
      .addIndex("Tickets", ["contactId", "whatsappId", "updatedAt"], {
        name: "idx_tickets_contact_whatsapp_updated"
      })
      .catch(() =>
        console.log("Index idx_tickets_contact_whatsapp_updated already exists")
      );

    // Index for updatedAt queries (time-based ticket filtering)
    await queryInterface
      .addIndex("Tickets", ["updatedAt"], {
        name: "idx_tickets_updatedAt"
      })
      .catch(() => console.log("Index idx_tickets_updatedAt already exists"));

    // Composite index for ListTicketsService with unread messages
    // Query: WHERE (userId = ? OR status = 'pending') AND queueId IN (...) AND unreadMessages > 0
    await queryInterface
      .addIndex("Tickets", ["queueId", "unreadMessages"], {
        name: "idx_tickets_queue_unread"
      })
      .catch(() =>
        console.log("Index idx_tickets_queue_unread already exists")
      );

    // Index for isGroup filtering (common filter)
    await queryInterface
      .addIndex("Tickets", ["isGroup"], {
        name: "idx_tickets_isGroup"
      })
      .catch(() => console.log("Index idx_tickets_isGroup already exists"));

    // Composite index for status + createdAt (listing with date filter)
    await queryInterface
      .addIndex("Tickets", ["status", "createdAt"], {
        name: "idx_tickets_status_createdAt"
      })
      .catch(() =>
        console.log("Index idx_tickets_status_createdAt already exists")
      );

    // Index for Typebot integration queries
    await queryInterface
      .addIndex("Tickets", ["typebotSessionId"], {
        name: "idx_tickets_typebot_session"
      })
      .catch(() =>
        console.log("Index idx_tickets_typebot_session already exists")
      );

    // ============================================
    // MESSAGES TABLE - Second most critical
    // ============================================

    // Index for bodySearch (full-text-like search optimization)
    // Query: WHERE bodySearch LIKE '%searchterm%'
    await queryInterface
      .addIndex("Messages", ["bodySearch"], {
        name: "idx_messages_bodySearch"
      })
      .catch(() => console.log("Index idx_messages_bodySearch already exists"));

    // Composite index for ticketId + createdAt (message listing with pagination)
    // Query: WHERE ticketId IN (...) ORDER BY createdAt DESC LIMIT 20
    await queryInterface
      .addIndex("Messages", ["ticketId", "createdAt"], {
        name: "idx_messages_ticket_createdAt"
      })
      .catch(() =>
        console.log("Index idx_messages_ticket_createdAt already exists")
      );

    // Index for quotedMsgId (quoted message lookups)
    await queryInterface
      .addIndex("Messages", ["quotedMsgId"], {
        name: "idx_messages_quotedMsgId"
      })
      .catch(() =>
        console.log("Index idx_messages_quotedMsgId already exists")
      );

    // Index for fromMe filtering
    await queryInterface
      .addIndex("Messages", ["fromMe"], {
        name: "idx_messages_fromMe"
      })
      .catch(() => console.log("Index idx_messages_fromMe already exists"));

    // Index for ack status queries
    await queryInterface
      .addIndex("Messages", ["ack"], {
        name: "idx_messages_ack"
      })
      .catch(() => console.log("Index idx_messages_ack already exists"));

    // Index for read status
    await queryInterface
      .addIndex("Messages", ["read"], {
        name: "idx_messages_read"
      })
      .catch(() => console.log("Index idx_messages_read already exists"));

    // ============================================
    // CONTACTS TABLE
    // ============================================

    // Index for name searches (case-insensitive via LOWER function)
    await queryInterface
      .addIndex("Contacts", ["name"], {
        name: "idx_contacts_name"
      })
      .catch(() => console.log("Index idx_contacts_name already exists"));

    // Index for email searches
    await queryInterface
      .addIndex("Contacts", ["email"], {
        name: "idx_contacts_email"
      })
      .catch(() => console.log("Index idx_contacts_email already exists"));

    // Index for isGroup filtering
    await queryInterface
      .addIndex("Contacts", ["isGroup"], {
        name: "idx_contacts_isGroup"
      })
      .catch(() => console.log("Index idx_contacts_isGroup already exists"));

    // Note: 'number' column already has UNIQUE constraint which creates an index

    // ============================================
    // CONTACTTAGS TABLE (Join table)
    // ============================================

    // Composite index for tag filtering queries
    // Query: WHERE tagId = ? (to find all contacts with a tag)
    await queryInterface
      .addIndex("ContactTags", ["tagId"], {
        name: "idx_contacttags_tagId"
      })
      .catch(() => console.log("Index idx_contacttags_tagId already exists"));

    // Composite index for contact + tag lookup
    await queryInterface
      .addIndex("ContactTags", ["contactId", "tagId"], {
        name: "idx_contacttags_contact_tag",
        unique: true
      })
      .catch(() =>
        console.log("Index idx_contacttags_contact_tag already exists")
      );

    // ============================================
    // TICKETTRAKING TABLE
    // ============================================

    // Index for ticketId lookups
    await queryInterface
      .addIndex("TicketTraking", ["ticketId"], {
        name: "idx_tickettraking_ticketId"
      })
      .catch(() =>
        console.log("Index idx_tickettraking_ticketId already exists")
      );

    // Index for whatsappId lookups
    await queryInterface
      .addIndex("TicketTraking", ["whatsappId"], {
        name: "idx_tickettraking_whatsappId"
      })
      .catch(() =>
        console.log("Index idx_tickettraking_whatsappId already exists")
      );

    // Index for userId lookups
    await queryInterface
      .addIndex("TicketTraking", ["userId"], {
        name: "idx_tickettraking_userId"
      })
      .catch(() =>
        console.log("Index idx_tickettraking_userId already exists")
      );

    // Index for closedAt (reporting queries)
    await queryInterface
      .addIndex("TicketTraking", ["closedAt"], {
        name: "idx_tickettraking_closedAt"
      })
      .catch(() =>
        console.log("Index idx_tickettraking_closedAt already exists")
      );

    // ============================================
    // SETTINGS TABLE
    // ============================================
    // Note: 'key' is already PRIMARY KEY, no additional index needed

    // ============================================
    // MESSAGE REACTIONS TABLE
    // ============================================

    // Index for messageId lookups
    await queryInterface
      .addIndex("MessageReactions", ["messageId"], {
        name: "idx_messagereactions_messageId"
      })
      .catch(() =>
        console.log("Index idx_messagereactions_messageId already exists")
      );

    // ============================================
    // USERS TABLE
    // ============================================

    // Index for email (login queries)
    await queryInterface
      .addIndex("Users", ["email"], {
        name: "idx_users_email"
      })
      .catch(() => console.log("Index idx_users_email already exists"));

    // Index for profile filtering
    await queryInterface
      .addIndex("Users", ["profile"], {
        name: "idx_users_profile"
      })
      .catch(() => console.log("Index idx_users_profile already exists"));

    // ============================================
    // WHATSAPPS TABLE
    // ============================================

    // Index for status queries
    await queryInterface
      .addIndex("Whatsapps", ["status"], {
        name: "idx_whatsapps_status"
      })
      .catch(() => console.log("Index idx_whatsapps_status already exists"));

    // Index for isDefault queries
    await queryInterface
      .addIndex("Whatsapps", ["isDefault"], {
        name: "idx_whatsapps_isDefault"
      })
      .catch(() => console.log("Index idx_whatsapps_isDefault already exists"));

    // ============================================
    // QUEUES TABLE
    // ============================================

    // Index for name lookups
    await queryInterface
      .addIndex("Queues", ["name"], {
        name: "idx_queues_name"
      })
      .catch(() => console.log("Index idx_queues_name already exists"));

    // ============================================
    // PENDING UPLOADS TABLE
    // ============================================

    // Index for status queries (processing pending uploads)
    await queryInterface
      .addIndex("PendingUploads", ["status"], {
        name: "idx_pendinguploads_status"
      })
      .catch(() =>
        console.log("Index idx_pendinguploads_status already exists")
      );

    // Index for createdAt (cleanup old pending uploads)
    await queryInterface
      .addIndex("PendingUploads", ["createdAt"], {
        name: "idx_pendinguploads_createdAt"
      })
      .catch(() =>
        console.log("Index idx_pendinguploads_createdAt already exists")
      );

    console.log("Performance indexes migration completed successfully!");
  },

  down: async (queryInterface: QueryInterface) => {
    // Remove all indexes in reverse order
    const indexesToRemove = [
      { table: "PendingUploads", name: "idx_pendinguploads_createdAt" },
      { table: "PendingUploads", name: "idx_pendinguploads_status" },
      { table: "Queues", name: "idx_queues_name" },
      { table: "Whatsapps", name: "idx_whatsapps_isDefault" },
      { table: "Whatsapps", name: "idx_whatsapps_status" },
      { table: "Users", name: "idx_users_profile" },
      { table: "Users", name: "idx_users_email" },
      { table: "MessageReactions", name: "idx_messagereactions_messageId" },
      { table: "TicketTraking", name: "idx_tickettraking_closedAt" },
      { table: "TicketTraking", name: "idx_tickettraking_userId" },
      { table: "TicketTraking", name: "idx_tickettraking_whatsappId" },
      { table: "TicketTraking", name: "idx_tickettraking_ticketId" },
      { table: "ContactTags", name: "idx_contacttags_contact_tag" },
      { table: "ContactTags", name: "idx_contacttags_tagId" },
      { table: "Contacts", name: "idx_contacts_isGroup" },
      { table: "Contacts", name: "idx_contacts_email" },
      { table: "Contacts", name: "idx_contacts_name" },
      { table: "Messages", name: "idx_messages_read" },
      { table: "Messages", name: "idx_messages_ack" },
      { table: "Messages", name: "idx_messages_fromMe" },
      { table: "Messages", name: "idx_messages_quotedMsgId" },
      { table: "Messages", name: "idx_messages_ticket_createdAt" },
      { table: "Messages", name: "idx_messages_bodySearch" },
      { table: "Tickets", name: "idx_tickets_typebot_session" },
      { table: "Tickets", name: "idx_tickets_status_createdAt" },
      { table: "Tickets", name: "idx_tickets_isGroup" },
      { table: "Tickets", name: "idx_tickets_queue_unread" },
      { table: "Tickets", name: "idx_tickets_updatedAt" },
      { table: "Tickets", name: "idx_tickets_contact_whatsapp_updated" },
      { table: "Tickets", name: "idx_tickets_status_contact_whatsapp" }
    ];

    for (const { table, name } of indexesToRemove) {
      await queryInterface
        .removeIndex(table, name)
        .catch(() =>
          console.log(`Index ${name} doesn't exist or already removed`)
        );
    }

    console.log("Performance indexes rollback completed!");
  }
};
