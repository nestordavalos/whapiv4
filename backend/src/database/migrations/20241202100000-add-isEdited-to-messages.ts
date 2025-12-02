import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Messages", "isEdited", {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Messages", "isEdited");
  }
};
