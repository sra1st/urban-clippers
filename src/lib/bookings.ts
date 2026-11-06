// Read-side queries for bookings. All writes live in engine.ts.
import { type Db, pool, q, type RowDataPacket } from "./db";
import { CANCEL_CUTOFF_MINUTES } from "./config";
import { hhmm, minutesUntil } from "./time";

export type BookingStatus = "booked" | "completed" | "cancelled" | "no_show";

export type BookingView = {
  id: number;
  code: string;
  status: BookingStatus;
  date: string;
  time: string;
  name: string;
  phone: string;
  barberId: number;
  barberName: string;
  total: number;
  source: "online" | "walkin";
  userId: number | null;
  /** Length of the visit in hours; the barber is held for all of it. */
  hours: number;
  /** True when the customer picked this barber, false when the studio assigned one. */
  barberRequested: boolean;
  note: string | null;
  services: { id: number; name: string; price: number }[];
  /** True while the person can still cancel or reschedule. */
  canChange: boolean;
};

const SELECT = `
  SELECT b.id, b.code, b.status, b.slot_date, b.slot_time, b.customer_name, b.phone, b.barber_id,
         br.name AS barber_name, b.total_bdt, b.source, b.user_id, b.hours, b.barber_requested, b.note
    FROM bookings b
    JOIN barbers br ON br.id = b.barber_id`;

async function hydrate(db: Db, rows: RowDataPacket[]): Promise<BookingView[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => Number(r.id));
  const marks = ids.map(() => "?").join(",");
  const svc = await q<RowDataPacket>(
    db,
    `SELECT booking_id, service_id, service_name, price_bdt FROM booking_services WHERE booking_id IN (${marks}) ORDER BY service_id`,
    ids,
  );
  const nowMs = Date.now();
  return rows.map((r) => {
    const date = String(r.slot_date);
    const time = hhmm(String(r.slot_time));
    const status = r.status as BookingStatus;
    return {
      id: Number(r.id),
      code: String(r.code),
      status,
      date,
      time,
      name: String(r.customer_name),
      phone: String(r.phone),
      barberId: Number(r.barber_id),
      barberName: String(r.barber_name),
      total: Number(r.total_bdt),
      source: r.source as "online" | "walkin",
      userId: r.user_id === null ? null : Number(r.user_id),
      hours: Number(r.hours ?? 1),
      barberRequested: Boolean(r.barber_requested),
      note: r.note === null ? null : String(r.note),
      services: svc
        .filter((s) => Number(s.booking_id) === Number(r.id))
        .map((s) => ({ id: Number(s.service_id), name: String(s.service_name), price: Number(s.price_bdt) })),
      canChange: status === "booked" && minutesUntil(date, time, nowMs) >= CANCEL_CUTOFF_MINUTES,
    };
  });
}

export async function getBookingByCode(code: string, db: Db = pool): Promise<BookingView | null> {
  const rows = await q<RowDataPacket>(db, `${SELECT} WHERE b.code = ?`, [code.trim().toUpperCase()]);
  return (await hydrate(db, rows))[0] ?? null;
}

export async function getBookingById(id: number, db: Db = pool): Promise<BookingView | null> {
  const rows = await q<RowDataPacket>(db, `${SELECT} WHERE b.id = ?`, [id]);
  return (await hydrate(db, rows))[0] ?? null;
}

export async function listUserBookings(userId: number): Promise<BookingView[]> {
  const rows = await q<RowDataPacket>(pool, `${SELECT} WHERE b.user_id = ? ORDER BY b.slot_date DESC, b.slot_time DESC LIMIT 60`, [userId]);
  return hydrate(pool, rows);
}

export async function listDayBookings(date: string): Promise<BookingView[]> {
  const rows = await q<RowDataPacket>(pool, `${SELECT} WHERE b.slot_date = ? ORDER BY b.slot_time, b.barber_id`, [date]);
  return hydrate(pool, rows);
}

export async function searchBookings(term: string): Promise<BookingView[]> {
  const t = term.trim().slice(0, 40);
  if (!t) return [];
  const digits = t.replace(/\D/g, "");
  const rows = await q<RowDataPacket>(
    pool,
    `${SELECT}
      WHERE b.code = ? OR b.customer_name LIKE ? ${digits.length >= 3 ? "OR b.phone LIKE ?" : ""}
      ORDER BY b.slot_date DESC, b.slot_time DESC LIMIT 40`,
    digits.length >= 3 ? [t.toUpperCase(), `%${t}%`, `%${digits}%`] : [t.toUpperCase(), `%${t}%`],
  );
  return hydrate(pool, rows);
}

export type ServiceRow = {
  id: number;
  category: string;
  name: string;
  description: string;
  price: number;
  isActive: boolean;
  sort: number;
};

export async function listServices(opts: { includeInactive?: boolean } = {}): Promise<ServiceRow[]> {
  const rows = await q<RowDataPacket>(
    pool,
    `SELECT id, category, name, description, price_bdt, is_active, sort_order FROM services
      ${opts.includeInactive ? "" : "WHERE is_active = 1"} ORDER BY sort_order, id`,
  );
  return rows.map((r) => ({
    id: Number(r.id),
    category: String(r.category),
    name: String(r.name),
    description: String(r.description),
    price: Number(r.price_bdt),
    isActive: Boolean(r.is_active),
    sort: Number(r.sort_order),
  }));
}

export async function listBarbers(): Promise<{ id: number; name: string }[]> {
  const rows = await q<RowDataPacket>(pool, "SELECT id, name FROM barbers WHERE is_active = 1 ORDER BY id");
  return rows.map((r) => ({ id: Number(r.id), name: String(r.name) }));
}

export async function listBarberOffDays(from: string, to: string): Promise<{ barberId: number; date: string }[]> {
  const rows = await q<RowDataPacket>(pool, "SELECT barber_id, off_date FROM barber_days_off WHERE off_date BETWEEN ? AND ?", [from, to]);
  return rows.map((r) => ({ barberId: Number(r.barber_id), date: String(r.off_date) }));
}
