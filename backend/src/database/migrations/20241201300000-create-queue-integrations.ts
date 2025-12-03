import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("QueueIntegrations", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "typebot"
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      typebotUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "URL del servidor Typebot"
      },
      typebotSlug: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Typebot flow identifier/slug"
      },
      typebotExpires: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: "Minutes until session expires (0 = never)"
      },
      typebotKeywordFinish: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Keyword to finish/close the conversation"
      },
      typebotKeywordRestart: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Keyword to restart the typebot flow"
      },
      typebotUnknownMessage: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Message to send when input is not recognized"
      },
      typebotRestartMessage: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Message to send when flow is restarted"
      },
      typebotDelayMessage: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1000,
        comment: "Delay in ms between typebot messages"
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.dropTable("QueueIntegrations");
  }
};
