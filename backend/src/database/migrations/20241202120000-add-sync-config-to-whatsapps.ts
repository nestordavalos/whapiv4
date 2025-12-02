import { QueryInterface, DataTypes } from "sequelize";

interface TableInfo {
  [key: string]: unknown;
}

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.transaction(async t => {
      const tableInfo = (await queryInterface.describeTable(
        "Whatsapps"
      )) as TableInfo;

      if (!tableInfo.syncMaxMessagesPerChat) {
        await queryInterface.addColumn(
          "Whatsapps",
          "syncMaxMessagesPerChat",
          {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 50
          },
          { transaction: t }
        );
      }

      if (!tableInfo.syncMaxChats) {
        await queryInterface.addColumn(
          "Whatsapps",
          "syncMaxChats",
          {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 100
          },
          { transaction: t }
        );
      }

      if (!tableInfo.syncMaxMessageAgeHours) {
        await queryInterface.addColumn(
          "Whatsapps",
          "syncMaxMessageAgeHours",
          {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 24
          },
          { transaction: t }
        );
      }

      if (!tableInfo.syncDelayBetweenChats) {
        await queryInterface.addColumn(
          "Whatsapps",
          "syncDelayBetweenChats",
          {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 100
          },
          { transaction: t }
        );
      }

      if (!tableInfo.syncMarkAsSeen) {
        await queryInterface.addColumn(
          "Whatsapps",
          "syncMarkAsSeen",
          {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true
          },
          { transaction: t }
        );
      }

      if (!tableInfo.syncCreateClosedForRead) {
        await queryInterface.addColumn(
          "Whatsapps",
          "syncCreateClosedForRead",
          {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true
          },
          { transaction: t }
        );
      }
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn("Whatsapps", "syncMaxMessagesPerChat", {
        transaction: t
      });
      await queryInterface.removeColumn("Whatsapps", "syncMaxChats", {
        transaction: t
      });
      await queryInterface.removeColumn("Whatsapps", "syncMaxMessageAgeHours", {
        transaction: t
      });
      await queryInterface.removeColumn("Whatsapps", "syncDelayBetweenChats", {
        transaction: t
      });
      await queryInterface.removeColumn("Whatsapps", "syncMarkAsSeen", {
        transaction: t
      });
      await queryInterface.removeColumn(
        "Whatsapps",
        "syncCreateClosedForRead",
        { transaction: t }
      );
    });
  }
};
