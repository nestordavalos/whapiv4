import { QueryInterface } from "sequelize";

module.exports = {
  up: async (_queryInterface: QueryInterface) => {
    // No-op: API tokens are stored as plaintext UUIDs.
    // Hashing was reverted because the frontend needs to display
    // the token and users rely on the same key across integrations.
  },

  down: async (_queryInterface: QueryInterface) => {
    // No-op
  }
};
