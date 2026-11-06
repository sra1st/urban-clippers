import { MAX_DAYS_AHEAD, MIN_LEAD_MINUTES, SLOT_MINUTES } from "./config";
import { type Db, pool, q, type RowDataPacket } from "./db";
import { addDays, fromMinutes, hhmm, minutesUntil, nowDhaka, toMinutes, weekdayOf } from "./time";

export type HoursRow = { weekday: number; closed: boolean; open: string; close: string };
export type SlotInfo = { time: string; available: boolean };
export type DayAvailability = { date: string; open: boolean; slots: SlotInfo[] };

export async function getHours(db: Db = pool): Promise<HoursRow[]> {
  const rows = await q<RowDataPacket>(db, "SELECT weekday, is_closed, open_time, close_time FROM shop_hours ORDER BY weekday");
  return rows.map((r) => ({
    weekday: Number(r.weekday),
    closed: Boolean(r.is_closed),
    open: hhmm(String(r.open_time)),
    close: hhmm(String(r.close_time)),
  }));
}

/** Start times for one day: open, open + slot, ... up to the last start that ends by closing time. */
export function slotTimesFor(h: HoursRow): string[] {
  if (h.closed) return [];
  const out: string[] = [];
  const end = toMinutes(h.close);
  for (let t = toMinutes(h.open); t + SLOT_MINUTES <= end; t += SLOT_MINUTES) out.push(fromMinutes(t));
  return out;
}

type Candidate = { id: number; name: string; load: number };

/** The start of each hour a booking of `hours` hours occupies: ["12:00", "13:00"] for 2 hours from 12:00. */
export const hourSlots = (time: string, hours: number): string[] =>
  Array.from({ length: hours }, (_, i) => fromMinutes(toMinutes(time) + i * SLOT_MINUTES));

/**
 * Active barbers who are working on `date` and free for every hour of the visit, least busy first.
 * Pass `barberId` to check one specific barber. `ignoreBookingId` lets a booking that is being moved overlap its own old hours.
 */
export async function freeBarbers(
  db: Db,
  date: string,
  time: string,
  hours = 1,
  opts: { barberId?: number | null; ignoreBookingId?: number | null } = {},
): Promise<Candidate[]> {
  const slots = hourSlots(time, hours).map((t) => `${t}:00`);
  const marks = slots.map(() => "?").join(",");
  const rows = await q<RowDataPacket>(
    db,
    `SELECT b.id, b.name,
            (SELECT COUNT(*) FROM booking_slots s WHERE s.barber_id = b.id AND s.slot_date = ?) AS load_count
       FROM barbers b
      WHERE b.is_active = 1
        ${opts.barberId ? "AND b.id = ?" : ""}
        AND NOT EXISTS (SELECT 1 FROM barber_days_off d WHERE d.barber_id = b.id AND d.off_date = ?)
        AND NOT EXISTS (SELECT 1 FROM booking_slots s WHERE s.barber_id = b.id AND s.slot_date = ? AND s.slot_time IN (${marks})
                         ${opts.ignoreBookingId ? "AND s.booking_id <> ?" : ""})`,
    [date, ...(opts.barberId ? [opts.barberId] : []), date, date, ...slots, ...(opts.ignoreBookingId ? [opts.ignoreBookingId] : [])],
  );
  // Fewest bookings that day first. Ties are shuffled so simultaneous requests spread across barbers.
  return rows
    .map((r) => ({ c: { id: Number(r.id), name: String(r.name), load: Number(r.load_count) }, r: Math.random() }))
    .sort((a, b) => a.c.load - b.c.load || a.r - b.r)
    .map((x) => x.c);
}

export type AvailabilityOpts = {
  admin?: boolean;
  /** Length of the visit in hours (default 1). A start time is only offered if every hour of it is free. */
  hours?: number;
  /** Only look at this barber's diary. Omit for "any barber". */
  barberId?: number | null;
  /** Booking code being rescheduled: its own current hours do not count as busy. */
  excludeCode?: string | null;
};

/**
 * Availability for every date in [from, to] using a handful of small queries.
 * A start time is available when at least one working barber (or the chosen barber) is free for the whole visit
 * and it is far enough in the future.
 */
export async function getAvailability(from: string, to: string, opts: AvailabilityOpts = {}): Promise<Record<string, DayAvailability>> {
  const hoursNeeded = Math.max(1, opts.hours ?? 1);
  const [hours, barbers, offs, slots] = await Promise.all([
    getHours(),
    q<RowDataPacket>(pool, `SELECT id FROM barbers WHERE is_active = 1 ${opts.barberId ? "AND id = ?" : ""}`, opts.barberId ? [opts.barberId] : []),
    q<RowDataPacket>(pool, "SELECT barber_id, off_date FROM barber_days_off WHERE off_date BETWEEN ? AND ?", [from, to]),
    q<RowDataPacket>(
      pool,
      `SELECT barber_id, slot_date, slot_time FROM booking_slots WHERE slot_date BETWEEN ? AND ?
         ${opts.excludeCode ? "AND booking_id <> COALESCE((SELECT id FROM bookings WHERE code = ?), 0)" : ""}`,
      opts.excludeCode ? [from, to, opts.excludeCode.trim().toUpperCase()] : [from, to],
    ),
  ]);

  const barberIds = barbers.map((b) => Number(b.id));
  const offSet = new Set(offs.map((o) => `${o.barber_id}|${o.off_date}`));
  const busy = new Map<string, Set<number>>();
  for (const s of slots) {
    const key = `${s.slot_date}|${hhmm(String(s.slot_time))}`;
    if (!busy.has(key)) busy.set(key, new Set());
    busy.get(key)!.add(Number(s.barber_id));
  }

  const today = nowDhaka().date;
  const lastBookable = addDays(today, MAX_DAYS_AHEAD);
  const nowMs = Date.now();
  const result: Record<string, DayAvailability> = {};

  for (let d = from; d <= to; d = addDays(d, 1)) {
    const h = hours.find((x) => x.weekday === weekdayOf(d));
    const times = h ? slotTimesFor(h) : [];
    const inWindow = opts.admin ? true : d >= today && d <= lastBookable;
    const working = barberIds.filter((id) => !offSet.has(`${id}|${d}`));
    const daySlots: SlotInfo[] = times.map((time, i) => {
      const until = minutesUntil(d, time, nowMs);
      const timeOk = opts.admin ? until > -SLOT_MINUTES : until >= MIN_LEAD_MINUTES;
      // The visit must fit before closing, and one barber must be free for every hour of it.
      const needed = times.slice(i, i + hoursNeeded);
      const fits = needed.length === hoursNeeded;
      const freeCount = fits ? working.filter((id) => needed.every((t) => !busy.get(`${d}|${t}`)?.has(id))).length : 0;
      return { time, available: inWindow && timeOk && freeCount > 0 };
    });
    result[d] = { date: d, open: times.length > 0 && inWindow, slots: daySlots };
  }
  return result;
}

/** First available start at or after `fromDate` (searching `fromDate` itself only for times after `afterTime`). */
export function findNext(
  days: Record<string, DayAvailability>,
  fromDate: string,
  afterTime?: string,
): { date: string; time: string } | null {
  for (const date of Object.keys(days).sort()) {
    if (date < fromDate) continue;
    for (const s of days[date].slots) {
      if (!s.available) continue;
      if (date === fromDate && afterTime && s.time <= afterTime) continue;
      return { date, time: s.time };
    }
  }
  return null;
}
