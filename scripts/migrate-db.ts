// Updates an existing database to the current schema without touching its data. Safe to repeat.
// Run from the project folder:  npm run db:migrate
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  for (const k of ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"]) {
    if (!process.env[k]) throw new Error(`Missing ${k}. Copy .env.example to .env.local and fill it in.`);
  }
  const mysql = await import("mysql2/promise");
  const { migrate } = await import("../src/lib/migrate");
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === "false" ? undefined : { minVersion: "TLSv1.2", rejectUnauthorized: true },
  });

  const sql = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8")
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  const statements = sql.split(/;\s*(?:\n|$)/).map((s) => s.trim()).filter(Boolean);
  // CREATE TABLE IF NOT EXISTS: adds any new table (otp_codes) and leaves existing ones alone.
  for (const stmt of statements) await conn.query(stmt);

  console.log("Updating the schema...");
  await migrate(conn, console.log);
  console.log("Database is up to date.");
  await conn.end();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
