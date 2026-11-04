import Link from "next/link";
import { BookingCard } from "@/components/admin/BookingCard";
import { WalkInButton } from "@/components/admin/WalkInButton";
import { field } from "@/components/ui";
import { getServicesSafe, groupByCategory } from "@/lib/data";
import { listBarberOffDays, listBarbers, listDayBookings, searchBookings, type BookingView } from "@/lib/bookings";
import { addDays, dayLabel, formatBDT, formatDayLong, isValidDate, nowDhaka } from "@/lib/time";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminSchedule({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const today = nowDhaka().date;
  const raw = one(sp.date) ?? "";
  const date = isValidDate(raw) ? raw : today;
  const q = (one(sp.q) ?? "").trim();

  const [barbers, bookings, offs, services, found] = await Promise.all([
    listBarbers(),
    listDayBookings(date),
    listBarberOffDays(date, date),
    getServicesSafe(),
    q ? searchBookings(q) : Promise.resolve([] as BookingView[]),
  ]);
  const offIds = new Set(offs.map((o) => o.barberId));
  const barberOpts = barbers.map((b) => ({ ...b, off: offIds.has(b.id) }));

  const live = bookings.filter((b) => b.status !== "cancelled");
  const stats = [
    { label: "Bookings", value: String(live.length) },
    { label: "Still to come", value: String(bookings.filter((b) => b.status === "booked").length) },
    { label: "Completed", value: String(bookings.filter((b) => b.status === "completed").length) },
    { label: "Expected takings", value: formatBDT(bookings.filter((b) => b.status === "booked" || b.status === "completed").reduce((n, b) => n + b.total, 0)) },
  ];

  const groups = groupByCategory(services).map((g) => ({
    category: g.category,
    items: g.items.map((s) => ({ id: s.id, name: s.name, description: s.description, price: s.price })),
  }));
  const navLink = "inline-flex min-h-11 items-center rounded-control border-2 border-line bg-white px-4 font-semibold hover:border-ink";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-slate">{dayLabel(date, today)}</p>
          <h1 className="text-3xl sm:text-4xl">{formatDayLong(date)}</h1>
        </div>
        <WalkInButton groups={groups} defaultDate={date < today ? today : date} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link href={`/admin?date=${addDays(date, -1)}`} className={navLink} aria-label="Previous day">
          &larr; Prev
        </Link>
        <Link href="/admin" className={navLink}>
          Today
        </Link>
        <Link href={`/admin?date=${addDays(date, 1)}`} className={navLink} aria-label="Next day">
          Next &rarr;
        </Link>
        <form action="/admin" className="flex items-center gap-2">
          <label htmlFor="d" className="sr-only">
            Jump to date
          </label>
          <input id="d" type="date" name="date" defaultValue={date} className={`${field} !min-h-11 !w-auto !py-2`} />
          <button type="submit" className={navLink}>
            Go
          </button>
        </form>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-panel border-2 border-line bg-white p-4">
            <dt className="text-sm font-semibold text-slate">{s.label}</dt>
            <dd className="mt-1 font-display text-3xl font-extrabold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      <form action="/admin" className="mt-6 flex max-w-xl gap-2" role="search">
        <input type="hidden" name="date" value={date} />
        <label htmlFor="q" className="sr-only">
          Search bookings by phone, name or code
        </label>
        <input id="q" name="q" defaultValue={q} placeholder="Search by phone, name or code" className={field} />
        <button type="submit" className="inline-flex min-h-12 items-center rounded-control bg-ink px-5 font-semibold text-white hover:bg-ink-3">
          Search
        </button>
      </form>

      {q && (
        <section className="mt-6" aria-labelledby="res">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="res" className="text-2xl">
              {found.length} result{found.length === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
            </h2>
            <Link href={`/admin?date=${date}`} className="font-semibold text-pole-dark underline underline-offset-4">
              Clear search
            </Link>
          </div>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {found.map((b) => (
              <li key={b.id}>
                <BookingCard b={b} showDate barbers={barberOpts} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8" aria-label="Schedule by barber">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {barbers.map((br) => {
            const mine = bookings.filter((b) => b.barberId === br.id);
            const off = offIds.has(br.id);
            return (
              <div key={br.id} className="min-w-0">
                <div className="mb-3 flex items-center justify-between gap-2 border-b-2 border-ink pb-2">
                  <h2 className="text-2xl">{br.name}</h2>
                  {off ? (
                    <span className="rounded-chip bg-[#fbe5e3] px-3 py-1 text-sm font-bold text-bad">Off today</span>
                  ) : (
                    <span className="text-sm font-semibold text-slate">{mine.filter((b) => b.status !== "cancelled").length} bookings</span>
                  )}
                </div>
                {mine.length === 0 ? (
                  <p className="rounded-panel border-2 border-dashed border-line p-4 text-slate">{off ? "Not working this day." : "No bookings yet."}</p>
                ) : (
                  <ul className="space-y-3">
                    {mine.map((b) => (
                      <li key={b.id}>
                        <BookingCard b={b} barbers={barberOpts} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
