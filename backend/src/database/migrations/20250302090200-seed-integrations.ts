import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const now = new Date();
    await queryInterface.bulkInsert("Integrations", [
      { key: "organization", value: "", createdAt: now, updatedAt: now },
      { key: "apikey", value: "", createdAt: now, updatedAt: now },
      { key: "urlApiN8N", value: "", createdAt: now, updatedAt: now },
      { key: "hubToken", value: "", createdAt: now, updatedAt: now },
      { key: "apiMaps", value: "", createdAt: now, updatedAt: now }
    ]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkDelete("Integrations", {
      key: ["organization", "apikey", "urlApiN8N", "hubToken", "apiMaps"]
    });
  }
};
