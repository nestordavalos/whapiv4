import { DataTypes, QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Contacts", "address", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ""
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Contacts", "address");
  }
};
