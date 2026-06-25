require("../bootstrap");

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

module.exports = {
  define: {
    charset: "utf8mb4",
    collate: "utf8mb4_bin"
  },
  dialect: process.env.DB_DIALECT || "mysql",
  timezone: process.env.DB_TIMEZONE || "-03:00",
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  logging:
    process.env.DB_LOG_SQL === "true"
      ? (sql: string, timing?: number) => {
          if (
            !timing ||
            timing >= parseNumber(process.env.DB_SLOW_QUERY_MS, 500)
          ) {
            // eslint-disable-next-line no-console
            console.log(`[sequelize] ${timing || 0}ms ${sql}`);
          }
        }
      : false,
  benchmark: process.env.DB_LOG_SQL === "true",
  pool: {
    max: parseNumber(process.env.DB_POOL_MAX, 20),
    min: parseNumber(process.env.DB_POOL_MIN, 0),
    acquire: parseNumber(process.env.DB_POOL_ACQUIRE_MS, 30000),
    idle: parseNumber(process.env.DB_POOL_IDLE_MS, 10000)
  },
  seederStorage: "json",
  seederStoragePath: "sequelizeData.json"
};
