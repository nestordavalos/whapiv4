"use strict";

const fs = require("fs");
const { spawnSync } = require("child_process");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

const run = (command, args, options = {}) =>
  spawnSync(command, args, {
    cwd: process.cwd(),
    env: options.env || process.env,
    encoding: options.encoding,
    stdio: options.stdio
  });

const assertSucceeded = (result, label) => {
  if (result.status === 0) return;
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  throw new Error(`${label} failed with status ${result.status}`);
};

const main = async () => {
  if (!fs.existsSync(".env")) {
    throw new Error("Local .env is required to locate the MySQL test server");
  }

  const localConfig = dotenv.parse(fs.readFileSync(".env"));
  const required = ["DB_HOST", "DB_USER"];
  for (const key of required) {
    if (!localConfig[key]) {
      throw new Error(`${key} is required in .env`);
    }
  }

  const databaseName = `whapiv4_jest_${process.pid}_${Date.now()}`;
  if (!/^whapiv4_jest_[0-9]+_[0-9]+$/.test(databaseName)) {
    throw new Error("Refusing to use an unsafe temporary database name");
  }

  const port = Number(localConfig.DB_PORT || 3306);
  const admin = await mysql.createConnection({
    host: localConfig.DB_HOST,
    port,
    user: localConfig.DB_USER,
    password: localConfig.DB_PASS
  });
  const testEnv = {
    ...process.env,
    NODE_ENV: "test",
    DB_DIALECT: localConfig.DB_DIALECT || "mysql",
    DB_HOST: localConfig.DB_HOST,
    DB_PORT: String(port),
    DB_USER: localConfig.DB_USER,
    DB_PASS: localConfig.DB_PASS,
    DB_NAME: databaseName,
    DB_TIMEZONE: localConfig.DB_TIMEZONE || "-03:00",
    JWT_SECRET: "unit-test-access-secret-not-for-production",
    JWT_REFRESH_SECRET: "unit-test-refresh-secret-not-for-production"
  };

  let created = false;
  let exitCode = 1;
  try {
    await admin.query(
      `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`
    );
    created = true;
    process.stdout.write(`Created isolated test database: ${databaseName}\n`);

    assertSucceeded(
      run(process.execPath, ["node_modules/typescript/bin/tsc"], {
        env: testEnv,
        encoding: "utf8"
      }),
      "TypeScript build"
    );

    assertSucceeded(
      run(
        process.execPath,
        ["node_modules/sequelize-cli/lib/sequelize", "db:migrate"],
        { env: testEnv, encoding: "utf8" }
      ),
      "Test database migration"
    );

    const tests = run(
      process.execPath,
      [
        "node_modules/jest/bin/jest.js",
        "src/__tests__/unit",
        "--runInBand",
        "--coverage=false",
        ...process.argv.slice(2)
      ],
      { env: testEnv, stdio: "inherit" }
    );
    exitCode = tests.status === null ? 1 : tests.status;
  } finally {
    if (created) {
      await admin.query(`DROP DATABASE \`${databaseName}\``);
      process.stdout.write(`Dropped isolated test database: ${databaseName}\n`);
    }
    await admin.end();
  }

  process.exitCode = exitCode;
};

main().catch(error => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
