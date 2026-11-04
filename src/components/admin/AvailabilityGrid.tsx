"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatTime12 } from "@/lib/time";
import { btn } from "../ui";

type Barber = { id: number; name: string };
type DateRow = { date: string; label: string; sub: string };
type Affected = { id: number; code: string; name: string; time: string };
type Conflict = { barber: Barber; date: string; dateLabel: string; affected: Affected[]; message: string };

/**
 * Rows are dates, columns are barbers. A ticked box means "working". Unticking a barber who already has
 * bookings that day opens a dialog: reassign them to free barbers, cancel them, or keep the barber working.
 */
export function AvailabilityGrid({
  barbers,
  rows,
  off,
  booked,
}: {
  barbers: Barber[];
  rows: DateRow[];
  off: string[]; // "barberId|date"
  booked: Record<string, number>; // "barberId|date" -> number of live bookings
}) {
  const router = useRouter();
  const [offSet, setOffSet] = useState(() => new Set(off));
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [resolving, setResolving] = useState(false);

  async function put(barber: Barber, date: string, dateLabel: string, turnOff: boolean, resolve?: "reassign" | "cancel") {
    const key = `${barber.id}|${date}`;
    setBusyKey(key);
    setError(null);
    try {
      const res = await fetch("/api/admin/barber-days", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barberId: barber.id, date, off: turnOff, resolve }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; affected?: Affected[] };
      if (res.ok) {
        setOffSet((s) => {
          const n = new Set(s);
          if (turnOff) n.add(key);
          else n.delete(key);
          return n;
        });
        setConflict(null);
        router.refresh();
      } else if (res.status === 409 && data.affected) {
        setConflict({ barber, date, dateLabel, affected: data.affected, message: data.error ?? "" });
      } else {
        setError(data.error ?? "Couldn't save that change.");
      }
    } catch {
      setError("Couldn't reach the server.");
    }
    setBusyKey(null);
    setResolving(false);
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 rounded-control border-2 border-bad bg-white p-3 font-semibold text-bad">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-panel border-2 border-line bg-white">
        <div className="hidden grid-cols-[11rem_repeat(4,minmax(0,1fr))_6rem] gap-2 border-b-2 border-ink bg-mist px-4 py-3 text-sm font-bold md:grid">
          <span>Date</span>
          {barbers.map((b) => (
            <span key={b.id}>{b.name}</span>
          ))}
          <span className="text-right">Working</span>
        </div>
        <ul className="divide-y divide-line">
          {rows.map((r) => {
            const working = barbers.filter((b) => !offSet.has(`${b.id}|${r.date}`)).length;
            return (
              <li key={r.date} className="grid grid-cols-2 gap-3 px-4 py-4 md:grid-cols-[11rem_repeat(4,minmax(0,1fr))_6rem] md:items-center md:gap-2 md:py-3">
                <div className="col-span-2 flex items-baseline justify-between md:col-span-1 md:block">
                  <p className="font-display text-xl font-bold leading-tight">{r.label}</p>
                  <p className="text-sm text-slate">{r.sub}</p>
                </div>
                {barbers.map((b) => {
                  const key = `${b.id}|${r.date}`;
                  const isOff = offSet.has(key);
                  const n = booked[key] ?? 0;
                  return (
                    <label key={b.id} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-control border-2 px-3 py-2 transition-colors ${isOff ? "border-line bg-mist" : "border-ink/15 bg-white hover:border-ink"} ${busyKey === key ? "opacity-60" : ""}`}>
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={!isOff}
                        disabled={busyKey !== null}
                        onChange={() => put(b, r.date, r.label, !isOff)}
                        aria-label={`${b.name} working on ${r.label}`}
                      />
                      <span
                        aria-hidden="true"
                        className={`grid size-6 shrink-0 place-items-center rounded-md border-2 peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-pole-dark ${isOff ? "border-line bg-white" : "border-ok bg-ok text-white"}`}
                      >
                        {!isOff && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12.5l4.5 4.5L19 7.5" />
                          </svg>
                        )}
                      </span>
                      <span className="min-w-0 leading-tight">
                        <span className="block font-semibold md:hidden">{b.name}</span>
                        <span className={`block text-sm ${isOff ? "font-semibold text-bad" : "text-slate"}`}>{isOff ? "Off" : n > 0 ? `${n} booked` : "Free"}</span>
                      </span>
                    </label>
                  );
                })}
                <p className="hidden text-right text-sm font-semibold tabular-nums md:block">
                  {working} of {barbers.length}
                </p>
              </li>
            );
          })}
        </ul>
      </div>

      {conflict && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4" onMouseDown={(e) => e.target === e.currentTarget && !resolving && setConflict(null)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="cf-h" className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-panel bg-paper p-6">
            <h2 id="cf-h" className="text-2xl">
              {conflict.barber.name} already has bookings
            </h2>
            <p className="mt-2 text-slate">
              {conflict.dateLabel}: {conflict.message}
            </p>
            <ul className="my-4 divide-y divide-line rounded-control border-2 border-line bg-white">
              {conflict.affected.map((a) => (
                <li key={a.id} className="flex justify-between gap-3 px-3 py-2.5 text-[15px]">
                  <span className="font-semibold tabular-nums">{formatTime12(a.time)}</span>
                  <span className="min-w-0 truncate">{a.name}</span>
                  <span className="text-slate">{a.code}</span>
                </li>
              ))}
            </ul>
            <div className="grid gap-2.5">
              <button
                type="button"
                disabled={resolving}
                className={btn.dark}
                onClick={() => {
                  setResolving(true);
                  void put(conflict.barber, conflict.date, conflict.dateLabel, true, "reassign");
                }}
              >
                {resolving ? "Working..." : "Reassign to other barbers"}
              </button>
              <button
                type="button"
                disabled={resolving}
                className={`${btn.outline} !border-bad !text-bad hover:!bg-bad hover:!text-white`}
                onClick={() => {
                  setResolving(true);
                  void put(conflict.barber, conflict.date, conflict.dateLabel, true, "cancel");
                }}
              >
                Cancel these bookings
              </button>
              <button type="button" disabled={resolving} className={btn.quiet} onClick={() => setConflict(null)}>
                Keep {conflict.barber.name} working
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
