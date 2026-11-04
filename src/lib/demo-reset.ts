// Puts the database into a clean, believable demo state. Used by `npm run db:setup`, `npm run db:reset`
// and the nightly POST /api/cron/reset-demo. Visitors' test bookings and accounts are wiped; the demo
// accounts, services, hours and a realistic schedule for the next few days are restored.
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { q, withTx, x, type RowDataPacket } from "./db";
import { slotTimesFor } from "./availability";
import { makeCode } from "./engine";
import { pruneRateLimits } from "./rate-limit";
import { BARBERS, DEMO_CUSTOMERS, HOURS, SERVICES } from "./seed-data";
import { DEMO_ADMIN_EMAIL, DEMO_CLIENT_EMAIL } from "./site";
import { addDays, nowDhaka, toMinutes, weekdayOf } from "./time";

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COMBOS = [[1], [2], [1, 4], [11], [2, 4], [5], [12], [1, 10], [6], [1, 5], [8, 1], [3], [4]];

export async function resetDemo(): Promise<{ bookings: number; days: number }> {
  const clientHash = await bcrypt.hash(randomBytes(24).toString("hex"), 10);
  const adminHash = await bcrypt.hash(randomBytes(24).toString("hex"), 10);
  const realAdminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const realAdminHash = process.env.ADMIN_PASSWORD ? await bcrypt.hash(process.env.ADMIN_PASSWORD, 10) : null;

  const today = nowDhaka();
  let count = 0;

  await withTx(async (c) => {
    // 1. Wipe everything visitors can create.
    await x(c, "DELETE FROM booking_slots");
    await x(c, "DELETE FROM booking_services");
    await x(c, "DELETE FROM bookings");
    await x(c, "DELETE FROM barber_days_off");
    await x(c, "DELETE FROM users WHERE is_demo = 0 AND role = 'client'");

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

    // 3. Demo accounts (their passwords are random: they can only be entered with the demo buttons).
    const upsertUser = async (name: string, email: string, phone: string, hash: string, role: "client" | "admin", demo: boolean) => {
      await x(
        c,
        `INSERT INTO users (name, email, phone, password_hash, role, is_demo) VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role), is_demo = VALUES(is_demo)`,
        [name, email, phone, hash, role, demo ? 1 : 0],
      );
      const [row] = await q<RowDataPacket>(c, "SELECT id FROM users WHERE email = ?", [email]);
      return Number(row.id);
    };
    const demoClientId = await upsertUser("Demo Client", DEMO_CLIENT_EMAIL, "01700000001", clientHash, "client", true);
    await upsertUser("Demo Admin", DEMO_ADMIN_EMAIL, "", adminHash, "admin", true);
    if (realAdminEmail && realAdminHash) {
      await upsertUser("Studio Admin", realAdminEmail, "", realAdminHash, "admin", false);
      await x(c, "UPDATE users SET password_hash = ? WHERE email = ?", [realAdminHash, realAdminEmail]);
    }

    // 4. A realistic schedule: yesterday to four days ahead.
    const used = new Map<string, Set<number>>(); // "date|HH:MM" -> barber ids
    const codes = new Set<string>();
    const names = DEMO_CUSTOMERS;
    let phoneSeq = 1000;
    const rows: {
      code: string;
      userId: number | null;
      name: string;
      phone: string;
      barberId: number;
      date: string;
      time: string;
      status: string;
      total: number;
      picked: (typeof SERVICES)[number][];
    }[] = [];

    const insert = async (opts: {
      date: string;
      time: string;
      barberId: number;
      services: number[];
      name: string;
      phone: string;
      userId?: number | null;
      status: string;
    }) => {
      let code = makeCode();
      while (codes.has(code)) code = makeCode();
      codes.add(code);
      const picked = SERVICES.filter((s) => opts.services.includes(s.id));
      const total = picked.reduce((n, s) => n + s.price, 0);
      // Collected here and written in three multi-row statements after the loops (see "Flush" below).
      rows.push({ code, userId: opts.userId ?? null, name: opts.name, phone: opts.phone, barberId: opts.barberId, date: opts.date, time: `${opts.time}:00`, status: opts.status, total, picked });
      const key = `${opts.date}|${opts.time}`;
      if (!used.has(key)) used.set(key, new Set());
      used.get(key)!.add(opts.barberId);
      count++;
    };

    const statusFor = (date: string, time: string, rand: number) => {
      if (date < today.date) return rand < 0.08 ? "no_show" : "completed";
      if (date === today.date && toMinutes(time) + 60 <= today.minutes) return "completed";
      return "booked";
    };

    // Bookings that belong to the demo client, so the account page has content.
    await insert({ date: addDays(today.date, -3), time: "18:00", barberId: 2, services: [1, 4], name: "Demo Client", phone: "01700000001", userId: demoClientId, status: "completed" });
    await insert({ date: addDays(today.date, 1), time: "20:00", barberId: 1, services: [2, 4], name: "Demo Client", phone: "01700000001", userId: demoClientId, status: "booked" });
    await insert({ date: addDays(today.date, 3), time: "17:00", barberId: 3, services: [12], name: "Demo Client", phone: "01700000001", userId: demoClientId, status: "booked" });

    for (let offset = -1; offset <= 4; offset++) {
      const date = addDays(today.date, offset);
      const rand = rng(Number(date.replace(/-/g, "")));
      const hours = HOURS.find((h) => h.weekday === weekdayOf(date))!;
      for (const time of slotTimesFor({ weekday: hours.weekday, closed: hours.closed, open: hours.open, close: hours.close })) {
        const hour = toMinutes(time) / 60;
        const r = rand();
        let n = hour >= 17 ? (r < 0.15 ? 0 : r < 0.4 ? 1 : r < 0.75 ? 2 : 3) : hour >= 13 ? (r < 0.4 ? 0 : r < 0.8 ? 1 : 2) : r < 0.5 ? 0 : 1;
        // Tomorrow 7:00 PM keeps exactly one chair free: ideal for showing the double-booking guard.
        if (offset === 1 && time === "19:00") n = 3;
        const key = `${date}|${time}`;
        const order = BARBERS.map((b) => b.id).sort(() => rand() - 0.5);
        for (const barberId of order) {
          if (n <= 0) break;
          if (used.get(key)?.has(barberId)) continue;
          const combo = COMBOS[Math.floor(rand() * COMBOS.length)];
          await insert({
            date,
            time,
            barberId,
            services: combo,
            name: names[Math.floor(rand() * names.length)],
            phone: `0170000${phoneSeq++}`,
            status: statusFor(date, time, rand()),
          });
          n--;
        }
      }
    }

    // Flush: bookings first, then look their ids up by code (no explicit ids, so the database's
    // own auto-increment stays in charge), then the slot rows and service rows that need those ids.
    if (rows.length) {
      await x(
        c,
        `INSERT INTO bookings (code, user_id, customer_name, phone, barber_id, slot_date, slot_time, status, source, total_bdt)
         VALUES ${rows.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, 'online', ?)").join(", ")}`,
        rows.flatMap((r) => [r.code, r.userId, r.name, r.phone, r.barberId, r.date, r.time, r.status, r.total]),
      );
      const idByCode = new Map((await q<RowDataPacket>(c, "SELECT id, code FROM bookings")).map((b) => [String(b.code), Number(b.id)]));
      const live = rows.filter((r) => r.status !== "cancelled");
      if (live.length) {
        await x(
          c,
          `INSERT INTO booking_slots (barber_id, slot_date, slot_time, booking_id) VALUES ${live.map(() => "(?, ?, ?, ?)").join(", ")}`,
          live.flatMap((r) => [r.barberId, r.date, r.time, idByCode.get(r.code)!]),
        );
      }
      const lines = rows.flatMap((r) => r.picked.map((s) => ({ id: idByCode.get(r.code)!, s })));
      await x(
        c,
        `INSERT INTO booking_services (booking_id, service_id, service_name, price_bdt) VALUES ${lines.map(() => "(?, ?, ?, ?)").join(", ")}`,
        lines.flatMap((l) => [l.id, l.s.id, l.s.name, l.s.price]),
      );
    }
  });

  await pruneRateLimits();
  return { bookings: count, days: 6 };
}
