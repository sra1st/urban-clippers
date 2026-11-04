import type { Metadata } from "next";
import { AvailabilityGrid } from "@/components/admin/AvailabilityGrid";
import { listBarberOffDays, listBarbers } from "@/lib/bookings";
import { pool, q, type RowDataPacket } from "@/lib/db";
import { addDays, dayLabel, formatDay, nowDhaka } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Barber availability" };

const DAYS = 21;

export default async function AvailabilityPage() {
  const today = nowDhaka().date;
  const last = addDays(today, DAYS - 1);
  const [barbers, offs, counts] = await Promise.all([
    listBarbers(),
    listBarberOffDays(today, last),
    q<RowDataPacket>(pool, "SELECT barber_id, slot_date, COUNT(*) AS n FROM booking_slots WHERE slot_date BETWEEN ? AND ? GROUP BY barber_id, slot_date", [today, last]),
  ]);

  const rows = Array.from({ length: DAYS }, (_, i) => {
    const date = addDays(today, i);
    const lbl = dayLabel(date, today);
    return { date, label: lbl, sub: lbl === formatDay(date) ? "" : formatDay(date) };
  });
  const booked: Record<string, number> = {};
  for (const c of counts) booked[`${c.barber_id}|${c.slot_date}`] = Number(c.n);

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl">Barber availability</h1>
      <p className="mb-6 mt-2 max-w-2xl text-slate">
        A ticked box means the barber is working that day. Untick a barber who is away or off. Customers only see times where at least one working barber is free. If you untick someone who already has bookings, you&apos;ll be asked what to do with them.
      </p>
      <AvailabilityGrid key={offs.map((o) => `${o.barberId}|${o.date}`).join(",")} barbers={barbers} rows={rows} off={offs.map((o) => `${o.barberId}|${o.date}`)} booked={booked} />
    </div>
  );
}
