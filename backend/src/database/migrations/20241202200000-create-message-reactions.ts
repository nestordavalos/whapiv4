import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("MessageReactions", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      messageId: {
        type: DataTypes.STRING,
        references: { model: "Messages", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      emoji: {
        type: DataTypes.STRING(32),
        allowNull: false
      },
      senderId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "WhatsApp ID del usuario que reaccionó"
      },
      senderName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Nombre del contacto que reaccionó"
      },
      fromMe: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE(6),
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE(6),
        allowNull: false
      }
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.dropTable("MessageReactions");
  }
};
