"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { dayLabel, nowDhaka } from "@/lib/time";

type Slot = { time: string; label: string; available: boolean };
type View = { date: string; title: string; slots: Slot[] } | "none" | "error" | null;

/** The hero's live strip: the next free start times, straight from the database. Tapping one starts a booking. */
export function LiveSlots() {
  const [view, setView] = useState<View>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const today = nowDhaka().date;
        let res = await fetch(`/api/availability?date=${today}`).then((r) => r.json());
        let date = today;
        let free: Slot[] = (res.slots ?? []).filter((s: Slot) => s.available);
        if (free.length === 0 && res.next) {
          date = res.next.date;
          res = await fetch(`/api/availability?date=${date}`).then((r) => r.json());
          free = (res.slots ?? []).filter((s: Slot) => s.available);
        }
        if (!alive) return;
        if (free.length === 0) return setView("none");
        const title = date === today ? "Free chairs today" : `Next free day: ${dayLabel(date, today)}`;
        setView({ date, title, slots: free.slice(0, 5) });
      } catch {
        if (alive) setView("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-[5.75rem]" aria-live="polite">
      {view === null && (
        <div className="flex gap-2" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="skeleton h-12 w-24 rounded-chip opacity-30" />
          ))}
        </div>
      )}
      {typeof view === "object" && view && (
        <>
          <p className="mb-2.5 text-sm font-semibold text-white/80">{view.title}</p>
          <ul className="flex flex-wrap gap-2">
            {view.slots.map((s, i) => (
              <li key={s.time} className="chip-in" style={{ animationDelay: `${i * 70}ms` }}>
                <Link
                  href={`/book?date=${view.date}&time=${s.time}`}
                  className="inline-flex min-h-12 items-center rounded-chip border-2 border-white/80 px-5 text-base font-bold text-white transition-colors hover:bg-white hover:text-ink"
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      {view === "none" && <p className="text-sm font-semibold text-white/80">No free chairs in the next 30 days. Call the studio.</p>}
    </div>
  );
}
