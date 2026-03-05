import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Revert bcrypt-hashed API tokens back to plaintext UUIDs
    // The previous migration hashed tokens making them unreadable in the UI
    const { v4: uuidv4 } = require("uuid");

    const [settings]: any = await queryInterface.sequelize.query(
      `SELECT \`key\`, value FROM Settings WHERE \`key\` = 'userApiToken' AND value LIKE '$2%'`
    );

    for (const setting of settings) {
      const newToken = uuidv4();
      await queryInterface.sequelize.query(
        `UPDATE Settings SET value = ? WHERE \`key\` = ?`,
        {
          replacements: [newToken, setting.key]
        }
      );
      console.log(
        `API token regenerated for "${setting.key}". New token: ${newToken}`
      );
    }
  },

  down: async (_queryInterface: QueryInterface) => {
    // No action needed - tokens remain as plaintext UUIDs
  }
};
