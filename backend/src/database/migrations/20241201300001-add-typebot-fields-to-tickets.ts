import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Add typebotSessionId to Tickets
    await queryInterface.addColumn("Tickets", "typebotSessionId", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    });

    // Add typebotStatus to Tickets
    await queryInterface.addColumn("Tickets", "typebotStatus", {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    });

    // Add useIntegration to Tickets
    await queryInterface.addColumn("Tickets", "useIntegration", {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    });

    // Add integrationId to Tickets
    await queryInterface.addColumn("Tickets", "integrationId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "QueueIntegrations",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "typebotSessionId");
    await queryInterface.removeColumn("Tickets", "typebotStatus");
    await queryInterface.removeColumn("Tickets", "useIntegration");
    await queryInterface.removeColumn("Tickets", "integrationId");
  }
};
