// All booking writes. The database is the source of truth: the UNIQUE key on booking_slots
// (barber, date, time) decides who gets a slot. The code here only chooses which barber to try.
import { randomInt } from "node:crypto";
import { CANCEL_CUTOFF_MINUTES, MAX_ACTIVE_PER_PHONE, MAX_DAYS_AHEAD, MIN_LEAD_MINUTES, SLOT_MINUTES } from "./config";
import { freeBarbers, getHours, hourSlots, slotTimesFor } from "./availability";
import { visitHours } from "./duration";
import { type BookingStatus, type BookingView, getBookingByCode, getBookingById } from "./bookings";
import { isDuplicate, isRetryable, pool, q, withTx, x, type PoolConnection, type RowDataPacket } from "./db";
import { BookingError } from "./errors";
import { addDays, formatTime12, hhmm, isValidDate, isValidTime, minutesUntil, nowDhaka, weekdayOf } from "./time";

export type Actor = "client" | "admin";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L

export function makeCode(): string {
  let s = "UC-";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return s;
}

/** Thrown inside a transaction to make it roll back and move on to the next barber. */
class SlotConflict extends Error {}

/** Checks the slot against opening hours, the booking window and the lead time. */
export async function assertSlotAllowed(date: string, time: string, actor: Actor, hoursNeeded = 1): Promise<void> {
  if (!isValidDate(date) || !isValidTime(time)) throw new BookingError("INVALID", "Choose a valid date and time.");
  const hours = (await getHours()).find((h) => h.weekday === weekdayOf(date));
  if (!hours || hours.closed) throw new BookingError("INVALID", "We're closed on that day.");
  const valid = slotTimesFor(hours);
  if (!valid.includes(time)) throw new BookingError("INVALID", "That start time isn't available. Pick one from the list.");
  if (!hourSlots(time, hoursNeeded).every((t) => valid.includes(t))) {
    throw new BookingError("INVALID", "That visit would run past closing time. Pick an earlier start.");
  }

  const today = nowDhaka().date;
  const until = minutesUntil(date, time);
  if (actor === "admin") {
    if (until <= -SLOT_MINUTES) throw new BookingError("INVALID", "That time has already passed.");
    return;
  }
  if (date < today || date > addDays(today, MAX_DAYS_AHEAD)) {
    throw new BookingError("INVALID", `Bookings open up to ${MAX_DAYS_AHEAD} days ahead.`);
  }
  if (until < MIN_LEAD_MINUTES) {
    throw new BookingError("INVALID", "That time is too soon to book online. Pick a later slot or call the studio.");
  }
}

async function loadServices(ids: number[]) {
  const unique = [...new Set(ids)];
  const marks = unique.map(() => "?").join(",");
  const rows = await q<RowDataPacket>(pool, `SELECT id, category, name, price_bdt FROM services WHERE is_active = 1 AND id IN (${marks})`, unique);
  if (rows.length !== unique.length) throw new BookingError("INVALID", "One of the selected services is no longer available.");
  return rows.map((r) => ({ id: Number(r.id), category: String(r.category), name: String(r.name), price: Number(r.price_bdt) }));
}

export type CreateInput = {
  date: string;
  time: string;
  serviceIds: number[];
  name: string;
  phone: string; // normalized, or "-" for a walk-in without a number
  userId?: number | null;
  note?: string | null;
  /** The barber the customer asked for. Omit or null for "any available barber". */
  barberId?: number | null;
  actor: Actor;
  source?: "online" | "walkin";
};

export async function createBooking(input: CreateInput): Promise<BookingView> {
  const services = await loadServices(input.serviceIds);
  const hours = visitHours(services);
  await assertSlotAllowed(input.date, input.time, input.actor, hours);
  const requested = input.barberId ?? null;
  if (requested) {
    const ok = await q<RowDataPacket>(pool, "SELECT id FROM barbers WHERE id = ? AND is_active = 1", [requested]);
    if (!ok[0]) throw new BookingError("INVALID", "Choose a valid barber.");
  }
  const total = services.reduce((sum, s) => sum + s.price, 0);

  if (input.actor === "client" && input.phone !== "-") {
    const today = nowDhaka().date;
    const [row] = await q<RowDataPacket>(
      pool,
      "SELECT COUNT(*) AS n FROM bookings WHERE phone = ? AND status = 'booked' AND slot_date >= ?",
      [input.phone, today],
    );
    if (Number(row.n) >= MAX_ACTIVE_PER_PHONE) {
      throw new BookingError("LIMIT", `This number already has ${MAX_ACTIVE_PER_PHONE} upcoming bookings. Cancel one or wait until a visit is done.`);
    }
  }

  // A few rounds: candidates are recomputed each round so one deadlock victim never causes a false "fully booked".
  for (let round = 0; round < 3; round++) {
    const candidates = await freeBarbers(pool, input.date, input.time, hours, { barberId: requested });
    if (candidates.length === 0) break;

    for (const barber of candidates) {
      for (let codeTry = 0; codeTry < 3; codeTry++) {
        const code = makeCode();
        try {
          const bookingId = await withTx(async (conn) => {
            await assertBarberWorking(conn, barber.id, input.date);
            const res = await x(
              conn,
              `INSERT INTO bookings (code, user_id, customer_name, phone, barber_id, slot_date, slot_time, source, hours, barber_requested, total_bdt, note)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                code,
                input.userId ?? null,
                input.name,
                input.phone,
                barber.id,
                input.date,
                input.time,
                input.source ?? "online",
                hours,
                requested ? 1 : 0,
                total,
                input.note || null,
              ],
            );
            const id = res.insertId;
            // One row per hour of the visit. The UNIQUE key (barber_id, slot_date, slot_time) rejects the
            // insert if another booking holds any of those hours, and the whole transaction rolls back.
            await insertSlots(conn, barber.id, input.date, input.time, hours, id);
            for (const s of services) {
              await x(conn, "INSERT INTO booking_services (booking_id, service_id, service_name, price_bdt) VALUES (?, ?, ?, ?)", [
                id,
                s.id,
                s.name,
                s.price,
              ]);
            }
            return id;
          });
          const created = await getBookingById(bookingId);
          if (!created) throw new Error("Booking was saved but could not be read back.");
          return created;
        } catch (err) {
          if (isDuplicate(err, "uq_bookings_code")) continue; // astronomically rare: new code, same barber
          if (err instanceof SlotConflict || isDuplicate(err) || isRetryable(err)) break; // try the next barber
          throw err;
        }
      }
    }
  }
  throw new BookingError(
    "SLOT_TAKEN",
    requested ? "That barber just got booked at that time. Pick another time, or choose any available barber." : "That time was just taken. Pick another time.",
  );
}

async function insertSlots(conn: PoolConnection, barberId: number, date: string, time: string, hours: number, bookingId: number) {
  const slots = hourSlots(time, hours);
  await x(
    conn,
    `INSERT INTO booking_slots (barber_id, slot_date, slot_time, booking_id) VALUES ${slots.map(() => "(?, ?, ?, ?)").join(", ")}`,
    slots.flatMap((t) => [barberId, date, `${t}:00`, bookingId]),
  );
}

async function assertBarberWorking(conn: PoolConnection, barberId: number, date: string) {
  const off = await q<RowDataPacket>(conn, "SELECT 1 FROM barber_days_off WHERE barber_id = ? AND off_date = ?", [barberId, date]);
  if (off.length > 0) throw new SlotConflict();
}

/** Loads a booking by code and locks its row for the rest of the transaction. */
async function lockBooking(conn: PoolConnection, code: string) {
  const rows = await q<RowDataPacket>(
    conn,
    "SELECT id, status, slot_date, slot_time, barber_id FROM bookings WHERE code = ? FOR UPDATE",
    [code.trim().toUpperCase()],
  );
  const b = rows[0];
  if (!b) throw new BookingError("NOT_FOUND", "We couldn't find that booking.");
  return {
    id: Number(b.id),
    status: String(b.status) as BookingStatus,
    date: String(b.slot_date),
    time: hhmm(String(b.slot_time)),
    barberId: Number(b.barber_id),
  };
}

function assertChangeable(b: { status: BookingStatus; date: string; time: string }, actor: Actor, verb: string) {
  if (b.status !== "booked") throw new BookingError("CONFLICT", `This booking is ${b.status.replace("_", " ")}, so it can't be ${verb}.`);
  if (actor !== "admin" && minutesUntil(b.date, b.time) < CANCEL_CUTOFF_MINUTES) {
    const hrs = CANCEL_CUTOFF_MINUTES / 60;
    throw new BookingError("TOO_LATE", `Changes close ${hrs} hours before your visit. Please call the studio.`);
  }
}

export async function cancelBooking(code: string, actor: Actor): Promise<BookingView> {
  await withTx(async (conn) => {
    const b = await lockBooking(conn, code);
    assertChangeable(b, actor, "cancelled");
    await x(conn, "UPDATE bookings SET status = 'cancelled' WHERE id = ?", [b.id]);
    await x(conn, "DELETE FROM booking_slots WHERE booking_id = ?", [b.id]); // frees the slot
  });
  const view = await getBookingByCode(code);
  if (!view) throw new BookingError("NOT_FOUND", "We couldn't find that booking.");
  return view;
}

export async function rescheduleBooking(code: string, newDate: string, newTime: string, actor: Actor): Promise<BookingView> {
  const current = await getBookingByCode(code);
  if (!current) throw new BookingError("NOT_FOUND", "We couldn't find that booking.");
  await assertSlotAllowed(newDate, newTime, actor, current.hours);
  assertChangeable(current, actor, "rescheduled");
  if (current.date === newDate && current.time === newTime) {
    throw new BookingError("INVALID", "That's the time you already have. Pick a different one.");
  }

  for (let round = 0; round < 3; round++) {
    const free = await freeBarbers(pool, newDate, newTime, current.hours, { ignoreBookingId: current.id });
    // Keep the same barber when possible. If the customer chose this barber, never swap them for another.
    const mine = free.filter((f) => f.id === current.barberId);
    const ordered = current.barberRequested ? mine : [...mine, ...free.filter((f) => f.id !== current.barberId)];
    if (ordered.length === 0) break;
    for (const barber of ordered) {
      try {
        await withTx(async (conn) => {
          const b = await lockBooking(conn, code);
          assertChangeable(b, actor, "rescheduled");
          await assertBarberWorking(conn, barber.id, newDate);
          await x(conn, "DELETE FROM booking_slots WHERE booking_id = ?", [b.id]);
          await insertSlots(conn, barber.id, newDate, newTime, current.hours, b.id);
          await x(conn, "UPDATE bookings SET barber_id = ?, slot_date = ?, slot_time = ? WHERE id = ?", [barber.id, newDate, newTime, b.id]);
        });
        const view = await getBookingByCode(code);
        if (!view) throw new Error("Booking vanished after reschedule.");
        return view;
      } catch (err) {
        if (err instanceof SlotConflict || isDuplicate(err) || isRetryable(err)) continue;
        throw err;
      }
    }
  }
  throw new BookingError(
    "SLOT_TAKEN",
    current.barberRequested ? `${current.barberName} isn't free at that time. Pick another time.` : "That time was just taken. Pick another time.",
  );
}

export async function setBookingStatus(id: number, status: "completed" | "no_show" | "cancelled"): Promise<BookingView> {
  await withTx(async (conn) => {
    const rows = await q<RowDataPacket>(conn, "SELECT id, status FROM bookings WHERE id = ? FOR UPDATE", [id]);
    if (!rows[0]) throw new BookingError("NOT_FOUND", "Booking not found.");
    if (rows[0].status !== "booked") throw new BookingError("CONFLICT", "Only active bookings can change status.");
    await x(conn, "UPDATE bookings SET status = ? WHERE id = ?", [status, id]);
    if (status === "cancelled") await x(conn, "DELETE FROM booking_slots WHERE booking_id = ?", [id]);
  });
  const view = await getBookingById(id);
  if (!view) throw new BookingError("NOT_FOUND", "Booking not found.");
  return view;
}

export async function reassignBooking(id: number, barberId: number): Promise<BookingView> {
  try {
    await withTx(async (conn) => {
      const rows = await q<RowDataPacket>(conn, "SELECT id, status, slot_date FROM bookings WHERE id = ? FOR UPDATE", [id]);
      const b = rows[0];
      if (!b) throw new BookingError("NOT_FOUND", "Booking not found.");
      if (b.status !== "booked") throw new BookingError("CONFLICT", "Only active bookings can be reassigned.");
      const barber = await q<RowDataPacket>(conn, "SELECT id FROM barbers WHERE id = ? AND is_active = 1", [barberId]);
      if (!barber[0]) throw new BookingError("INVALID", "Choose a valid barber.");
      const off = await q<RowDataPacket>(conn, "SELECT 1 FROM barber_days_off WHERE barber_id = ? AND off_date = ?", [barberId, String(b.slot_date)]);
      if (off.length > 0) throw new BookingError("CONFLICT", "That barber is marked unavailable on this day.");
      await x(conn, "UPDATE booking_slots SET barber_id = ? WHERE booking_id = ?", [barberId, id]);
      await x(conn, "UPDATE bookings SET barber_id = ? WHERE id = ?", [barberId, id]);
    });
  } catch (err) {
    if (isDuplicate(err)) throw new BookingError("CONFLICT", "That barber already has a booking at this time.");
    throw err;
  }
  const view = await getBookingById(id);
  if (!view) throw new BookingError("NOT_FOUND", "Booking not found.");
  return view;
}

export type AffectedBooking = { id: number; code: string; name: string; time: string; hours: number };

/**
 * Marks a barber unavailable (off = true) or available (off = false) for one date.
 * If the barber already has bookings that day, the caller must choose to "reassign" or "cancel" them;
 * otherwise a CONFLICT error lists the affected bookings and nothing changes.
 */
export async function setBarberOff(barberId: number, date: string, off: boolean, resolve?: "reassign" | "cancel"): Promise<AffectedBooking[]> {
  if (!isValidDate(date)) throw new BookingError("INVALID", "Choose a valid date.");
  const barber = await q<RowDataPacket>(pool, "SELECT id FROM barbers WHERE id = ? AND is_active = 1", [barberId]);
  if (!barber[0]) throw new BookingError("INVALID", "Choose a valid barber.");

  if (!off) {
    await x(pool, "DELETE FROM barber_days_off WHERE barber_id = ? AND off_date = ?", [barberId, date]);
    return [];
  }

  try {
    return await withTx(async (conn) => {
      await x(conn, "INSERT INTO barber_days_off (barber_id, off_date) VALUES (?, ?) ON DUPLICATE KEY UPDATE barber_id = barber_id", [barberId, date]);
      const rows = await q<RowDataPacket>(
        conn,
        "SELECT id, code, customer_name, slot_time, hours FROM bookings WHERE barber_id = ? AND slot_date = ? AND status = 'booked' ORDER BY slot_time FOR UPDATE",
        [barberId, date],
      );
      const affected: AffectedBooking[] = rows.map((r) => ({
        id: Number(r.id),
        code: String(r.code),
        name: String(r.customer_name),
        time: hhmm(String(r.slot_time)),
        hours: Number(r.hours),
      }));
      if (affected.length === 0) return [];
      if (!resolve) {
        throw new BookingError("CONFLICT", `${affected.length} booking${affected.length > 1 ? "s" : ""} on this day. Reassign or cancel them first.`, { affected });
      }
      for (const a of affected) {
        if (resolve === "cancel") {
          await x(conn, "UPDATE bookings SET status = 'cancelled' WHERE id = ?", [a.id]);
          await x(conn, "DELETE FROM booking_slots WHERE booking_id = ?", [a.id]);
          continue;
        }
        const free = await freeBarbers(conn, date, a.time, a.hours); // this barber is already excluded: his off-day row exists
        if (free.length === 0) {
          throw new BookingError("CONFLICT", `No other barber is free at ${formatTime12(a.time)} for ${a.name}. Cancel that booking or free up a barber first.`, { affected });
        }
        await x(conn, "UPDATE booking_slots SET barber_id = ? WHERE booking_id = ?", [free[0].id, a.id]);
        await x(conn, "UPDATE bookings SET barber_id = ? WHERE id = ?", [free[0].id, a.id]);
      }
      return affected;
    });
  } catch (err) {
    if (isDuplicate(err)) throw new BookingError("CONFLICT", "Another change happened at the same moment. Try again.");
    throw err;
  }
}
