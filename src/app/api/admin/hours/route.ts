import { json, readBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { SLOT_MINUTES } from "@/lib/config";
import { pool, x } from "@/lib/db";
import { BookingError } from "@/lib/errors";
import { toMinutes } from "@/lib/time";
import { hoursSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export const PUT = route(async (req) => {
  await requireAdmin();
  const rows = hoursSchema.parse(await readBody(req));
  for (const r of rows) {
    if (!r.closed && toMinutes(r.close) - toMinutes(r.open) < SLOT_MINUTES) {
      throw new BookingError("INVALID", `Closing time must be at least ${SLOT_MINUTES} minutes after opening time.`);
    }
  }
  for (const r of rows) {
    await x(
      pool,
      `INSERT INTO shop_hours (weekday, is_closed, open_time, close_time) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE is_closed = VALUES(is_closed), open_time = VALUES(open_time), close_time = VALUES(close_time)`,
      [r.weekday, r.closed ? 1 : 0, `${r.open}:00`, `${r.close}:00`],
    );
  }
  return json({ ok: true });
});
