import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Add integrationId to Queues
    await queryInterface.addColumn("Queues", "integrationId", {
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
    await queryInterface.removeColumn("Queues", "integrationId");
  }
};
