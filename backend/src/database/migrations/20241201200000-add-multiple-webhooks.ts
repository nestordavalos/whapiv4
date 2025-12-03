import { QueryInterface, DataTypes } from "sequelize";

interface TableColumns {
  [key: string]: any;
}

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Verificar si webhookUrls ya existe
    const tableDesc = (await queryInterface.describeTable(
      "Whatsapps"
    )) as TableColumns;

    // Si webhookUrls no existe, crearla
    if (!tableDesc.webhookUrls) {
      await queryInterface.addColumn("Whatsapps", "webhookUrls", {
        type: DataTypes.TEXT,
        allowNull: true
      });
    }

    // Migrar datos existentes de webhookUrl a webhookUrls como array (si webhookUrl existe)
    if (tableDesc.webhookUrl) {
      const selectQuery =
        "SELECT id, webhookUrl, webhookEvents FROM Whatsapps " +
        "WHERE webhookUrl IS NOT NULL AND webhookUrl != ''";
      const [whatsapps] = await queryInterface.sequelize.query(selectQuery);

      for (const whatsapp of whatsapps as any[]) {
        const webhooks = [
          {
            id: "1",
            name: "Webhook Principal",
            url: whatsapp.webhookUrl,
            enabled: true,
            events: whatsapp.webhookEvents
              ? JSON.parse(whatsapp.webhookEvents)
              : []
          }
        ];

        const updateQuery =
          "UPDATE Whatsapps SET webhookUrls = :webhookUrls WHERE id = :id";
        await queryInterface.sequelize.query(updateQuery, {
          replacements: {
            webhookUrls: JSON.stringify(webhooks),
            id: whatsapp.id
          }
        });
      }

      // Eliminar las columnas antiguas
      await queryInterface.removeColumn("Whatsapps", "webhookUrl");
    }

    if (tableDesc.webhookEvents) {
      await queryInterface.removeColumn("Whatsapps", "webhookEvents");
    }

    return Promise.resolve();
  },

  down: async (queryInterface: QueryInterface) => {
    const tableDesc = (await queryInterface.describeTable(
      "Whatsapps"
    )) as TableColumns;

    // Recrear las columnas antiguas si no existen
    if (!tableDesc.webhookUrl) {
      await queryInterface.addColumn("Whatsapps", "webhookUrl", {
        type: DataTypes.TEXT,
        allowNull: true
      });
    }

    if (!tableDesc.webhookEvents) {
      await queryInterface.addColumn("Whatsapps", "webhookEvents", {
        type: DataTypes.TEXT,
        allowNull: true
      });
    }

    // Migrar datos de vuelta (solo el primer webhook)
    if (tableDesc.webhookUrls) {
      const selectQuery =
        "SELECT id, webhookUrls FROM Whatsapps " +
        "WHERE webhookUrls IS NOT NULL AND webhookUrls != ''";
      const [whatsapps] = await queryInterface.sequelize.query(selectQuery);

      for (const whatsapp of whatsapps as any[]) {
        try {
          const webhooks = JSON.parse(whatsapp.webhookUrls);
          if (webhooks.length > 0) {
            const updateQuery =
              "UPDATE Whatsapps SET webhookUrl = :webhookUrl, " +
              "webhookEvents = :webhookEvents WHERE id = :id";
            await queryInterface.sequelize.query(updateQuery, {
              replacements: {
                webhookUrl: webhooks[0].url,
                webhookEvents: JSON.stringify(webhooks[0].events || []),
                id: whatsapp.id
              }
            });
          }
        } catch (e) {
          // Ignorar errores de parsing
        }
      }

      // Eliminar la nueva columna
      await queryInterface.removeColumn("Whatsapps", "webhookUrls");
    }

    return Promise.resolve();
  }
};
