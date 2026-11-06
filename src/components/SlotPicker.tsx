"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { dayLabel, formatDayLong, toMinutes } from "@/lib/time";

type DayInfo = { date: string; open: boolean; available: boolean };
type SlotInfo = { time: string; label: string; available: boolean };
type DayData = { date: string; open: boolean; slots: SlotInfo[]; next: { date: string; time: string; label: string } | null };

const wd = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });
const mo = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const parts = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  return { wd: wd.format(d), day: d.getUTCDate(), mo: mo.format(d) };
};

const GROUPS = [
  { title: "Morning", test: (m: number) => m < 12 * 60 },
  { title: "Afternoon", test: (m: number) => m >= 12 * 60 && m < 17 * 60 },
  { title: "Evening", test: (m: number) => m >= 17 * 60 },
];

/**
 * Date strip + start-time chips, fed by /api/availability. Used by the booking flow, rescheduling and the admin walk-in form.
 * Unavailable times stay visible but disabled, so the grid never jumps around.
 * `nearTime` is the time somebody just lost to another booking: the closest free times get a highlight.
 */
export function SlotPicker({
  date,
  time,
  onSelect,
  admin = false,
  refreshKey = 0,
  nearTime = null,
  hours = 1,
  barberId = null,
  excludeCode = null,
}: {
  date: string | null;
  time: string | null;
  onSelect: (date: string, time: string | null) => void;
  admin?: boolean;
  refreshKey?: number;
  nearTime?: string | null;
  /** Visit length in hours: only start times where every hour is free are offered. */
  hours?: number;
  /** Show only this barber's free times. null = any barber. */
  barberId?: number | null;
  /** Booking code being rescheduled: its own current hours count as free. */
  excludeCode?: string | null;
}) {
  const [days, setDays] = useState<{ today: string; list: DayInfo[] } | null>(null);
  const [loaded, setLoaded] = useState<{ key: string; data: DayData } | null>(null);
  const [retry, setRetry] = useState(0);
  const qs = `hours=${hours}${barberId ? `&barber=${barberId}` : ""}${excludeCode ? `&exclude=${encodeURIComponent(excludeCode)}` : ""}`;
  const dayKey = `${date}|${admin ? 1 : 0}|${refreshKey}|${retry}|${qs}`;
  // Data only counts while it belongs to the current date/refresh; otherwise show the skeleton.
  const day = loaded && loaded.key === dayKey ? loaded.data : null;
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const selectedChip = useRef<HTMLButtonElement>(null);

  // 1. The list of bookable dates.
  useEffect(() => {
    let alive = true;
    fetch(`/api/availability/days?${qs}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("days"))))
      .then((d: { today: string; days: DayInfo[] }) => {
        if (!alive) return;
        setDays({ today: d.today, list: d.days });
        setError(null);
        if (!date) {
          const first = admin ? d.days[0] : (d.days.find((x) => x.available) ?? d.days[0]);
          if (first) onSelect(first.date, null);
        }
      })
      .catch(() => alive && setError("We couldn't load the calendar. Check your connection and try again."));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, retry, qs]);

  // 2. The start times for the chosen date.
  useEffect(() => {
    if (!date) return;
    const mine = ++seq.current;
    fetch(`/api/availability?date=${date}${admin ? "&admin=1" : ""}&${qs}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("day"))))
      .then((d: DayData) => {
        if (mine !== seq.current) return;
        setLoaded({ key: dayKey, data: d });
        setError(null);
      })
      .catch(() => mine === seq.current && setError("We couldn't load the free times. Check your connection and try again."));
  }, [date, admin, refreshKey, retry, dayKey, qs]);

  useEffect(() => {
    selectedChip.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [date, days]);

  const near = useMemo(() => {
    if (!nearTime || !day) return new Set<string>();
    const free = day.slots.filter((s) => s.available);
    free.sort((a, b) => Math.abs(toMinutes(a.time) - toMinutes(nearTime)) - Math.abs(toMinutes(b.time) - toMinutes(nearTime)));
    return new Set(free.slice(0, 3).map((s) => s.time));
  }, [nearTime, day]);

  if (error) {
    return (
      <div role="alert" className="rounded-panel border-2 border-line bg-white p-5">
        <p className="font-semibold">{error}</p>
        <button type="button" onClick={() => setRetry((n) => n + 1)} className="mt-3 inline-flex min-h-11 items-center rounded-control bg-ink px-4 font-semibold text-white">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div role="group" aria-label="Choose a date" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {days
          ? days.list.map((d) => {
              const p = parts(d.date);
              const selected = d.date === date;
              const disabled = !d.available && !admin;
              return (
                <button
                  key={d.date}
                  ref={selected ? selectedChip : undefined}
                  type="button"
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => onSelect(d.date, d.date === date ? time : null)}
                  className={`flex min-h-[5.25rem] w-[4.6rem] shrink-0 flex-col items-center justify-center rounded-panel border-2 px-1 py-2 text-center transition-colors disabled:cursor-not-allowed ${
                    selected ? "border-ink bg-ink text-white" : disabled ? "border-line bg-mist text-slate/70" : "border-line bg-white hover:border-ink-3"
                  }`}
                >
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-80">{dayLabel(d.date, days.today).replace(/,.*/, "").slice(0, 8)}</span>
                  <span className="font-display text-2xl font-bold leading-none">{p.day}</span>
                  <span className="mt-0.5 text-xs font-medium opacity-80">{disabled ? "Full" : p.mo}</span>
                </button>
              );
            })
          : Array.from({ length: 7 }).map((_, i) => <span key={i} className="skeleton h-[5.25rem] w-[4.6rem] shrink-0 rounded-panel" aria-hidden="true" />)}
      </div>

      <div className="mt-6" aria-live="polite">
        {!date || !day ? (
          <div className="space-y-5" aria-hidden="true">
            {[0, 1].map((g) => (
              <div key={g}>
                <span className="skeleton mb-3 block h-4 w-24 rounded" />
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="skeleton h-12 rounded-control" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <h3 className="sr-only">Start times for {formatDayLong(date)}</h3>
            {!day.slots.some((s) => s.available) && !admin && (
              <div className="mb-5 rounded-panel border-2 border-ink bg-white p-4">
                <p className="font-bold">Fully booked on {formatDayLong(date)}.</p>
                {day.next ? (
                  <button
                    type="button"
                    onClick={() => onSelect(day.next!.date, day.next!.time)}
                    className="mt-2 inline-flex min-h-11 items-center rounded-control bg-pole px-4 font-semibold text-ink hover:bg-[#e2b560]"
                  >
                    Next free: {days ? dayLabel(day.next.date, days.today) : day.next.date}, {day.next.label}
                  </button>
                ) : (
                  <p className="mt-1 text-slate">No free times in the next 30 days. Please call the studio.</p>
                )}
              </div>
            )}
            {GROUPS.map((g) => {
              const slots = day.slots.filter((s) => g.test(toMinutes(s.time)));
              if (slots.length === 0) return null;
              return (
                <section key={g.title} className="mb-5" aria-label={g.title}>
                  <h4 className="mb-2.5 text-sm font-bold uppercase tracking-wide text-slate">{g.title}</h4>
                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((s) => {
                      const selected = s.time === time;
                      return (
                        <li key={s.time}>
                          <button
                            type="button"
                            aria-pressed={selected}
                            disabled={!s.available}
                            onClick={() => onSelect(date, s.time)}
                            className={`min-h-12 w-full rounded-control border-2 px-1 text-base font-semibold tabular-nums transition-colors ${
                              selected
                                ? "border-ink bg-ink text-white"
                                : s.available
                                  ? `bg-white hover:border-ink-3 ${near.has(s.time) ? "border-pole ring-2 ring-pole/60" : "border-line"}`
                                  : "cursor-not-allowed border-transparent bg-mist text-slate/60 line-through"
                            }`}
                          >
                            {s.label}
                            {!s.available && <span className="sr-only"> (not available)</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
