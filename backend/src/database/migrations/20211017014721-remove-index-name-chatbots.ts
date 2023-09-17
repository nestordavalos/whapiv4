import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    return queryInterface.removeIndex("Chatbots", "name");
  },
  down: async (queryInterface: QueryInterface) => {
    return queryInterface.removeIndex("Chatbots", "name");
  }
};
