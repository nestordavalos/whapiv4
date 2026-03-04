import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Hash existing plaintext API tokens using bcryptjs
    const bcrypt = require("bcryptjs");

    const [settings]: any = await queryInterface.sequelize.query(
      `SELECT \`key\`, value FROM Settings WHERE \`key\` = 'userApiToken' AND value IS NOT NULL AND value != '' AND value NOT LIKE '$2%'`
    );

    for (const setting of settings) {
      const hashedValue = await bcrypt.hash(setting.value, 10);
      await queryInterface.sequelize.query(
        `UPDATE Settings SET value = ? WHERE \`key\` = ?`,
        {
          replacements: [hashedValue, setting.key]
        }
      );
    }
  },

  down: async (_queryInterface: QueryInterface) => {
    // Cannot unhash - this migration is irreversible
    // Tokens will need to be regenerated if rolled back
    console.warn(
      "WARNING: Cannot reverse API token hashing. Tokens must be regenerated manually."
    );
  }
};
