// Creates the tables (safe to repeat) and loads the demo data.
// Run from the project folder:  npm run db:setup
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
  const statements = sql
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) await conn.query(stmt);
  const { migrate } = await import("../src/lib/migrate");
  await migrate(conn, console.log); // upgrades an older database in place; does nothing on a fresh one
  console.log(`Schema ready (${statements.length} statements).`);
  await conn.end();

  const { resetDemo } = await import("../src/lib/demo-reset");
  const { pool } = await import("../src/lib/db");
  const res = await resetDemo();
  console.log(`Demo data loaded: 4 barbers, ${res.services} services, no sample bookings.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
