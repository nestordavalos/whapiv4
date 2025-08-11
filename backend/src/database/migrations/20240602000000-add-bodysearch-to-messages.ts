import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Messages", "bodySearch", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addIndex("Messages", ["bodySearch"], {
      name: "message_bodySearch_index"
    });

    const dialect = queryInterface.sequelize.getDialect();
    const table = dialect === "postgres" ? '"Messages"' : "`Messages`";
    const bodySearch = dialect === "postgres" ? '"bodySearch"' : "`bodySearch`";
    const body = dialect === "postgres" ? '"body"' : "`body`";
    const substring =
      dialect === "postgres"
        ? `LOWER(SUBSTRING(${body} FROM 1 FOR 255))`
        : `LOWER(SUBSTRING(${body}, 1, 255))`;

    await queryInterface.sequelize.query(
      `UPDATE ${table} SET ${bodySearch} = ${substring}`
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("Messages", "message_bodySearch_index");
    await queryInterface.removeColumn("Messages", "bodySearch");
  }
};

