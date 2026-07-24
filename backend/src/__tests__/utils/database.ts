import database from "../../database";

const runQuery = (connection: any, sql: string): Promise<void> =>
  new Promise((resolve, reject) => {
    connection.query(sql, (error: Error | null) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

const truncate = async (): Promise<void> => {
  const connection = await database.connectionManager.getConnection({
    type: "write"
  });
  try {
    await runQuery(connection, "SET FOREIGN_KEY_CHECKS = 0");
    const tableNames = database.modelManager.models.map(model => {
      const table = model.getTableName();
      return typeof table === "string" ? table : table.tableName;
    });

    for (const tableName of tableNames) {
      if (!/^[A-Za-z0-9_]+$/.test(tableName)) {
        throw new Error(`Unsafe test table name: ${tableName}`);
      }
      await runQuery(connection, `TRUNCATE TABLE \`${tableName}\``);
    }
  } finally {
    await runQuery(connection, "SET FOREIGN_KEY_CHECKS = 1");
    await database.connectionManager.releaseConnection(connection);
  }
};

const disconnect = async (): Promise<void> => {
  return database.connectionManager.close();
};

export { truncate, disconnect };
