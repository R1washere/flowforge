import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const databasePath = join(rootDir, "prisma", "dev.db");
const migrationPath = join(
  rootDir,
  "prisma",
  "migrations",
  "20260829114500_init",
  "migration.sql",
);

mkdirSync(dirname(databasePath), { recursive: true });

if (existsSync(databasePath)) {
  rmSync(databasePath);
}

const database = new DatabaseSync(databasePath);

try {
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec(readFileSync(migrationPath, "utf8"));
  console.log(`SQLite database created at ${databasePath}`);
} finally {
  database.close();
}
