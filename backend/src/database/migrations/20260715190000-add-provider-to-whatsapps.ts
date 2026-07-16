import { QueryInterface, DataTypes } from "sequelize";

interface TableInfo {
  [key: string]: unknown;
}

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableInfo = (await queryInterface.describeTable(
      "Whatsapps"
    )) as TableInfo;

    if (!tableInfo.provider) {
      await queryInterface.addColumn("Whatsapps", "provider", {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "wwebjs"
      });
    }
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Whatsapps", "provider");
  }
};
