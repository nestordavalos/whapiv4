import { DataTypes, QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Contacts", "messengerId", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn("Contacts", "instagramId", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn("Contacts", "telegramId", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn("Contacts", "webchatId", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await queryInterface.changeColumn("Contacts", "number", {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    });

    await queryInterface.addColumn("Whatsapps", "type", {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Contacts", "messengerId");
    await queryInterface.removeColumn("Contacts", "instagramId");
    await queryInterface.removeColumn("Contacts", "telegramId");
    await queryInterface.removeColumn("Contacts", "webchatId");

    await queryInterface.changeColumn("Contacts", "number", {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    });

    await queryInterface.removeColumn("Whatsapps", "type");
  }
};
