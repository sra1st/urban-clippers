"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { normalizePhone } from "@/lib/phone";
import { formatBDT, formatDay, formatTime12 } from "@/lib/time";
import { SlotPicker } from "../SlotPicker";
import type { FlowGroup } from "../BookingFlow";
import { btn, field, label } from "../ui";

/** "Add walk-in": books a customer who is standing at the desk. Same transaction and UNIQUE guard as online bookings. */
export function WalkInButton({ groups, defaultDate }: { groups: FlowGroup[]; defaultDate: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ids, setIds] = useState<number[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lost, setLost] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const all = groups.flatMap((g) => g.items);
  const total = all.filter((s) => ids.includes(s.id)).reduce((n, s) => n + s.price, 0);
  const phoneOk = phone.trim() === "" || normalizePhone(phone) !== null;
  const ready = ids.length > 0 && date && time && name.trim().length >= 2 && phoneOk;

  async function submit() {
    if (!ready || !date || !time) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, time, serviceIds: ids, name: name.trim(), phone: phone.trim() === "" ? "" : normalizePhone(phone) }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string; booking?: { barberName: string } };
      if (res.status === 201) {
        setOpen(false);
        setIds([]);
        setName("");
        setPhone("");
        setTime(null);
        router.push(`/admin?date=${date}`);
        router.refresh();
        return;
      }
      if (data.code === "SLOT_TAKEN") {
        setLost(time);
        setTime(null);
        setRefreshKey((k) => k + 1);
      }
      setError(data.error ?? "Couldn't add the walk-in.");
    } catch {
      setError("Couldn't reach the server.");
    }
    setBusy(false);
  }

  return (
    <>
      <button
        type="button"
        className={btn.primary}
        onClick={() => {
          setDate(defaultDate);
          setTime(null);
          setError(null);
          setOpen(true);
        }}
      >
        + Add walk-in
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="wi-h" className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.25rem] bg-paper sm:rounded-panel">
            <div className="flex items-center justify-between border-b border-line bg-white px-5 py-4">
              <h2 id="wi-h" className="text-2xl">
                Add walk-in
              </h2>
              <button type="button" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-control hover:bg-mist" aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="space-y-8 overflow-y-auto px-5 py-6">
              {error && (
                <p role="alert" className="rounded-control border-2 border-bad bg-white p-3 font-semibold text-bad">
                  {error}
                </p>
              )}

              <fieldset>
                <legend className="mb-3 text-sm font-bold uppercase tracking-wide text-slate">Services</legend>
                <div className="space-y-4">
                  {groups.map((g) => (
                    <div key={g.category}>
                      <p className="mb-1.5 text-sm font-semibold text-slate">{g.category}</p>
                      <ul className="flex flex-wrap gap-2">
                        {g.items.map((s) => {
                          const on = ids.includes(s.id);
                          return (
                            <li key={s.id}>
                              <button
                                type="button"
                                aria-pressed={on}
                                onClick={() => setIds((c) => (on ? c.filter((x) => x !== s.id) : c.length >= 4 ? c : [...c, s.id]))}
                                className={`min-h-11 rounded-chip border-2 px-4 text-[15px] font-semibold ${on ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink-3"}`}
                              >
                                {s.name} <span className="tabular-nums opacity-75">{formatBDT(s.price)}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </fieldset>

              <div>
                <p className="mb-3 text-sm font-bold uppercase tracking-wide text-slate">Time</p>
                <SlotPicker admin date={date} time={time} refreshKey={refreshKey} nearTime={lost} onSelect={(d, t) => { setDate(d); setTime(t); if (t) setLost(null); }} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="wi-name" className={label}>
                    Customer name
                  </label>
                  <input id="wi-name" className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
                </div>
                <div>
                  <label htmlFor="wi-phone" className={label}>
                    Phone <span className="font-normal text-slate">(optional)</span>
                  </label>
                  <input id="wi-phone" className={field} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01712 345 678" aria-invalid={!phoneOk} />
                  {!phoneOk && <p className="mt-1.5 text-sm font-semibold text-bad">Use a Bangladesh mobile number or leave it empty.</p>}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line bg-white px-5 py-4">
              <p className="min-w-0 text-sm text-slate">
                {date && time ? (
                  <>
                    <span className="font-semibold text-ink">
                      {formatDay(date)}, {formatTime12(time)}
                    </span>
                    {" · "}
                    <span className="font-semibold tabular-nums text-ink">{formatBDT(total)}</span>
                  </>
                ) : (
                  "Choose services and a time"
                )}
              </p>
              <button type="button" disabled={busy || !ready} onClick={submit} className={btn.primary}>
                {busy ? "Adding..." : "Add booking"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
