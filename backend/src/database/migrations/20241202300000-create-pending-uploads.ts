import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("PendingUploads", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      filename: {
        type: DataTypes.STRING(500),
        allowNull: false,
        unique: true
      },
      mimeType: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      size: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM("pending", "syncing", "completed", "failed"),
        defaultValue: "pending",
        allowNull: false
      },
      retryCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      lastError: {
        type: DataTypes.STRING(1000),
        allowNull: true
      },
      lastAttempt: {
        type: DataTypes.DATE,
        allowNull: true
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

    await queryInterface.addIndex("PendingUploads", ["filename"]);
    await queryInterface.addIndex("PendingUploads", ["status"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("PendingUploads");
  }
};
