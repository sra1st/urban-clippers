// Puts the database into a clean, believable demo state. Used by `npm run db:setup`, `npm run db:reset`
// and the nightly POST /api/cron/reset-demo. Visitors' test bookings and accounts are wiped; the demo
// accounts, services and opening hours are restored. No sample bookings are created: the schedule starts
// empty, so every booking you see is one that you or a visitor actually made.
import bcrypt from "bcryptjs";
import { q, withTx, x, type RowDataPacket } from "./db";
import { pruneRateLimits } from "./rate-limit";
import { BARBERS, HOURS, SERVICES } from "./seed-data";

export async function resetDemo(): Promise<{ services: number }> {
  const realAdminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const realAdminHash = process.env.ADMIN_PASSWORD ? await bcrypt.hash(process.env.ADMIN_PASSWORD, 10) : null;

  await withTx(async (c) => {
    // 1. Wipe everything visitors can create.
    await x(c, "DELETE FROM booking_slots");
    await x(c, "DELETE FROM booking_services");
    await x(c, "DELETE FROM bookings");
    await x(c, "DELETE FROM barber_days_off");
    await x(c, "DELETE FROM otp_codes");
    await x(c, "DELETE FROM users WHERE role = 'client' OR is_demo = 1");

    // 2. Barbers, services, hours back to defaults.
    // One multi-row statement per table. Every query is a network round trip to the database, and
    // the nightly reset has to finish inside Netlify's 30-second function limit.
    await x(
      c,
      `INSERT INTO barbers (id, name, is_active) VALUES ${BARBERS.map(() => "(?, ?, 1)").join(", ")}
       ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = 1`,
      BARBERS.flatMap((b) => [b.id, b.name]),
    );
    await x(
      c,
      `INSERT INTO services (id, category, name, description, price_bdt, sort_order, is_active) VALUES ${SERVICES.map(() => "(?, ?, ?, ?, ?, ?, 1)").join(", ")}
       ON DUPLICATE KEY UPDATE category = VALUES(category), name = VALUES(name), description = VALUES(description),
                               price_bdt = VALUES(price_bdt), sort_order = VALUES(sort_order), is_active = 1`,
      SERVICES.flatMap((s) => [s.id, s.category, s.name, s.description, s.price, s.sort]),
    );
    await x(c, `DELETE FROM services WHERE id NOT IN (${SERVICES.map(() => "?").join(",")})`, SERVICES.map((s) => s.id));
    await x(
      c,
      `INSERT INTO shop_hours (weekday, is_closed, open_time, close_time) VALUES ${HOURS.map(() => "(?, ?, ?, ?)").join(", ")}
       ON DUPLICATE KEY UPDATE is_closed = VALUES(is_closed), open_time = VALUES(open_time), close_time = VALUES(close_time)`,
      HOURS.flatMap((h) => [h.weekday, h.closed ? 1 : 0, `${h.open}:00`, `${h.close}:00`]),
    );

    // 3. The private admin login, only when ADMIN_EMAIL and ADMIN_PASSWORD are set (see docs/DEPLOY.md).
    const upsertUser = async (name: string, email: string, phone: string | null, hash: string, role: "client" | "admin", demo: boolean) => {
      await x(
        c,
        `INSERT INTO users (name, email, phone, password_hash, role, is_demo) VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role), is_demo = VALUES(is_demo)`,
        [name, email, phone, hash, role, demo ? 1 : 0],
      );
      const [row] = await q<RowDataPacket>(c, "SELECT id FROM users WHERE email = ?", [email]);
      return Number(row.id);
    };
    if (realAdminEmail && realAdminHash) {
      await upsertUser("Studio Admin", realAdminEmail, null, realAdminHash, "admin", false);
      await x(c, "UPDATE users SET password_hash = ? WHERE email = ?", [realAdminHash, realAdminEmail]);
    }
  });

  await pruneRateLimits();
  return { services: SERVICES.length };
}
