import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await Promise.all([
      // Índice compuesto para consultas filtradas por status y ordenadas por updatedAt
      queryInterface.addIndex("Tickets", ["status", "updatedAt"], {
        name: "ticket_status_updatedAt_composite_index"
      }),
      // Índice compuesto para consultas filtradas por status y ordenadas por createdAt
      queryInterface.addIndex("Tickets", ["status", "createdAt"], {
        name: "ticket_status_createdAt_composite_index"
      }),
      // Índice para updatedAt (si no existe ya) para ordenamiento general
      queryInterface.addIndex("Tickets", ["updatedAt"], {
        name: "ticket_updatedAt_index"
      }),
      // Índice para unreadMessages usado en filtro withUnreadMessages
      queryInterface.addIndex("Tickets", ["unreadMessages"], {
        name: "ticket_unreadMessages_index"
      })
    ]);
  },

  down: async (queryInterface: QueryInterface) => {
    await Promise.all([
      queryInterface.removeIndex(
        "Tickets",
        "ticket_status_updatedAt_composite_index"
      ),
      queryInterface.removeIndex(
        "Tickets",
        "ticket_status_createdAt_composite_index"
      ),
      queryInterface.removeIndex("Tickets", "ticket_updatedAt_index"),
      queryInterface.removeIndex("Tickets", "ticket_unreadMessages_index")
    ]);
  }
};
