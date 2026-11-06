// Brings an existing database up to the current schema. Safe to run any number of times.
// Fresh databases already get the final shape from db/schema.sql, so every step below is then a no-op.
import type { Connection } from "mysql2/promise";

async function count(conn: Connection, sql: string, params: unknown[]): Promise<number> {
  const [rows] = await conn.query(sql, params);
  return Number((rows as { n: number }[])[0]?.n ?? 0);
}

const hasColumn = (c: Connection, table: string, col: string) =>
  count(c, "SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?", [table, col]).then((n) => n > 0);

const hasIndex = (c: Connection, table: string, idx: string) =>
  count(c, "SELECT COUNT(*) AS n FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?", [table, idx]).then((n) => n > 0);

const isNullable = async (c: Connection, table: string, col: string) => {
  const [rows] = await c.query("SELECT is_nullable AS v FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?", [table, col]);
  return String((rows as { v: string }[])[0]?.v) === "YES";
};

export async function migrate(conn: Connection, log: (m: string) => void = () => {}): Promise<void> {
  const step = async (name: string, needed: () => Promise<boolean>, run: () => Promise<unknown>) => {
    if (await needed()) {
      await run();
      log(`  done: ${name}`);
    }
  };

  // Bookings can now last several hours and remember whether the customer picked the barber.
  await step("bookings.hours", async () => !(await hasColumn(conn, "bookings", "hours")), () =>
    conn.query("ALTER TABLE bookings ADD COLUMN hours TINYINT NOT NULL DEFAULT 1"));
  await step("bookings.barber_requested", async () => !(await hasColumn(conn, "bookings", "barber_requested")), () =>
    conn.query("ALTER TABLE bookings ADD COLUMN barber_requested TINYINT(1) NOT NULL DEFAULT 0"));

  // A booking may now own several slot rows (one per hour). Add the plain index first (the foreign key needs one), then drop the unique one.
  await step("booking_slots index", async () => !(await hasIndex(conn, "booking_slots", "idx_slot_booking")), () =>
    conn.query("ALTER TABLE booking_slots ADD INDEX idx_slot_booking (booking_id)"));
  await step("drop one-slot-per-booking rule", () => hasIndex(conn, "booking_slots", "uq_slot_booking"), () =>
    conn.query("ALTER TABLE booking_slots DROP INDEX uq_slot_booking"));

  // Clients sign in by phone: email and password become optional, phone becomes the unique identity.
  await step("users.email optional", () => isNullable(conn, "users", "email").then((n) => !n), () =>
    conn.query("ALTER TABLE users MODIFY email VARCHAR(160) NULL"));
  await step("users.password_hash optional", () => isNullable(conn, "users", "password_hash").then((n) => !n), () =>
    conn.query("ALTER TABLE users MODIFY password_hash VARCHAR(100) NULL"));
  await step("users.phone optional", () => isNullable(conn, "users", "phone").then((n) => !n), () =>
    conn.query("ALTER TABLE users MODIFY phone VARCHAR(20) NULL"));
  await step("users.phone unique", async () => !(await hasIndex(conn, "users", "uq_users_phone")), async () => {
    await conn.query("UPDATE users SET phone = NULL WHERE phone = ''");
    // Old accounts could share a number. Keep it on the oldest account only.
    await conn.query(
      `UPDATE users u JOIN (SELECT phone, MIN(id) AS keep_id FROM users WHERE phone IS NOT NULL GROUP BY phone HAVING COUNT(*) > 1) d
          ON u.phone = d.phone AND u.id <> d.keep_id SET u.phone = NULL`,
    );
    await conn.query("ALTER TABLE users ADD UNIQUE KEY uq_users_phone (phone)");
  });
}
