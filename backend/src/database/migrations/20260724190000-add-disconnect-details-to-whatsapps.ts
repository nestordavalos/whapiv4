import { DataTypes, QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.addColumn("Whatsapps", "disconnectReason", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("Whatsapps", "disconnectCode", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn("Whatsapps", "disconnectedAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn("Whatsapps", "disconnectedAt");
    await queryInterface.removeColumn("Whatsapps", "disconnectCode");
    await queryInterface.removeColumn("Whatsapps", "disconnectReason");
  }
};
