import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("Whatsapps", "webhookUrl", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
      }),
      queryInterface.addColumn("Whatsapps", "webhookEnabled", {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
      }),
      queryInterface.addColumn("Whatsapps", "webhookEvents", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
        comment:
          "JSON array of event types to send: message_received, message_sent, message_ack, connection_update, ticket_created, ticket_updated"
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("Whatsapps", "webhookUrl"),
      queryInterface.removeColumn("Whatsapps", "webhookEnabled"),
      queryInterface.removeColumn("Whatsapps", "webhookEvents")
    ]);
  }
};
