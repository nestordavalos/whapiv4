import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await Promise.all([
      queryInterface.addIndex("Tickets", ["status"], {
        name: "ticket_status_index"
      }),
      queryInterface.addIndex("Tickets", ["createdAt"], {
        name: "ticket_createdAt_index"
      }),
      queryInterface.addIndex("Tickets", ["userId"], {
        name: "ticket_userId_index"
      }),
      queryInterface.addIndex("Tickets", ["contactId"], {
        name: "ticket_contactId_index"
      }),
      queryInterface.addIndex("Tickets", ["whatsappId"], {
        name: "ticket_whatsappId_index"
      }),
      queryInterface.addIndex("Tickets", ["queueId"], {
        name: "ticket_queueId_index"
      }),
      queryInterface.addIndex("Messages", ["createdAt"], {
        name: "message_createdAt_index"
      }),
      queryInterface.addIndex("Messages", ["ticketId"], {
        name: "message_ticketId_index"
      }),
      queryInterface.addIndex("Messages", ["contactId"], {
        name: "message_contactId_index"
      })
    ]);
  },

  down: async (queryInterface: QueryInterface) => {
    await Promise.all([
      queryInterface.removeIndex("Tickets", "ticket_status_index"),
      queryInterface.removeIndex("Tickets", "ticket_createdAt_index"),
      queryInterface.removeIndex("Tickets", "ticket_userId_index"),
      queryInterface.removeIndex("Tickets", "ticket_contactId_index"),
      queryInterface.removeIndex("Tickets", "ticket_whatsappId_index"),
      queryInterface.removeIndex("Tickets", "ticket_queueId_index"),
      queryInterface.removeIndex("Messages", "message_createdAt_index"),
      queryInterface.removeIndex("Messages", "message_ticketId_index"),
      queryInterface.removeIndex("Messages", "message_contactId_index")
    ]);
  }
};
