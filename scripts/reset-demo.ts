// Resets the demo data without touching the schema.  Run from the project folder:  npm run db:reset
import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  const { resetDemo } = await import("../src/lib/demo-reset");
  const { pool } = await import("../src/lib/db");
  const res = await resetDemo();
  console.log(`Demo data reset: ${res.services} services restored, all bookings cleared.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
