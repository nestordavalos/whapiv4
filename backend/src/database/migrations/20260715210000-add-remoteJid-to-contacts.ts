import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.addColumn("Contacts", "remoteJid", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ""
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn("Contacts", "remoteJid");
  }
};
