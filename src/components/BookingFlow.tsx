"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { MAX_SERVICES_PER_BOOKING } from "@/lib/config";
import { normalizePhone } from "@/lib/phone";
import { formatBDT, formatDayLong, formatTime12 } from "@/lib/time";
import { SlotPicker } from "./SlotPicker";
import { btn, field, label } from "./ui";

export type FlowGroup = { category: string; items: { id: number; name: string; description: string; price: number }[] };

const STEPS = ["Services", "Time", "Details", "Review"];

export function BookingFlow({
  groups,
  user,
  preset,
  demoNotice,
}: {
  groups: FlowGroup[];
  user: { name: string; phone: string } | null;
  preset: { serviceIds: number[]; date: string | null; time: string | null };
  demoNotice: boolean;
}) {
  const router = useRouter();
  const all = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const [step, setStep] = useState(preset.serviceIds.length > 0 ? 2 : 1);
  const [ids, setIds] = useState<number[]>(preset.serviceIds);
  const [date, setDate] = useState<string | null>(preset.date);
  const [time, setTime] = useState<string | null>(preset.time);
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lostTime, setLostTime] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const top = useRef<HTMLDivElement>(null);

  const chosen = all.filter((s) => ids.includes(s.id));
  const total = chosen.reduce((n, s) => n + s.price, 0);
  const normalized = normalizePhone(phone);
  const nameOk = name.trim().length >= 2;

  const canContinue = step === 1 ? ids.length > 0 : step === 2 ? Boolean(date && time) : step === 3 ? nameOk && Boolean(normalized) : true;

  function go(n: number) {
    setStep(n);
    setError(null);
    setTried(false);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function next() {
    if (!canContinue) {
      setTried(true);
      return;
    }
    if (step < 4) go(step + 1);
    else void submit();
  }

  function toggle(id: number) {
    setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX_SERVICES_PER_BOOKING ? cur : [...cur, id]));
  }

  async function submit() {
    if (!date || !time || !normalized) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, time, serviceIds: ids, name: name.trim(), phone: normalized }),
      });
      const data = (await res.json().catch(() => ({}))) as { booking?: { code: string }; error?: string; code?: string };
      if (res.status === 201 && data.booking) {
        router.push(`/booking/${data.booking.code}?new=1`);
        return; // stay "busy" while the next page loads
      }
      if (data.code === "SLOT_TAKEN") {
        // Someone else got the last chair a moment ago. Keep everything typed, refresh the grid, point at nearby times.
        setLostTime(time);
        setTime(null);
        setRefreshKey((k) => k + 1);
        setStep(2);
        setError("That time was just taken by someone else. Nothing is lost: pick one of the highlighted times, or any other free time.");
        top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  const summary = (
    <dl className="space-y-3 text-[15px]">
      <div>
        <dt className="text-xs font-bold uppercase tracking-wide text-slate">Services</dt>
        <dd className="mt-1">
          {chosen.length === 0 ? (
            <span className="text-slate">None yet</span>
          ) : (
            <ul className="space-y-1">
              {chosen.map((s) => (
                <li key={s.id} className="flex justify-between gap-3">
                  <span>{s.name}</span>
                  <span className="font-semibold tabular-nums">{formatBDT(s.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-bold uppercase tracking-wide text-slate">When</dt>
        <dd className="mt-1">{date && time ? `${formatDayLong(date)}, ${formatTime12(time)}` : <span className="text-slate">Not chosen yet</span>}</dd>
      </div>
      <div className="flex items-baseline justify-between border-t-2 border-ink pt-3">
        <dt className="font-bold">Total</dt>
        <dd className="font-display text-2xl font-extrabold tabular-nums">{formatBDT(total)}</dd>
      </div>
      <p className="text-sm text-slate">Pay at the studio after your visit. Cash, bKash or Nagad.</p>
    </dl>
  );

  return (
    <div ref={top} className="scroll-mt-20">
      {/* Progress */}
      <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Booking steps">
        {STEPS.map((s, i) => {
          const n = i + 1;
          const state = n === step ? "current" : n < step ? "done" : "todo";
          return (
            <li key={s} aria-current={state === "current" ? "step" : undefined}>
              <button
                type="button"
                disabled={state === "todo" || busy}
                onClick={() => go(n)}
                className="group block w-full text-left disabled:cursor-default"
              >
                <span className={`block h-1.5 rounded-full ${state === "current" ? "pole-bar" : state === "done" ? "bg-ink" : "bg-line"}`} />
                <span className={`mt-2 block text-sm font-semibold ${state === "todo" ? "text-slate/70" : "text-ink"}`}>
                  <span className="tabular-nums">{n}</span>
                  <span className="hidden sm:inline">. {s}</span>
                  <span className="sr-only sm:hidden">. {s}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 pb-32 lg:pb-0">
          {error && (
            <div role="alert" className="mb-6 rounded-panel border-2 border-bad bg-white p-4 font-semibold text-bad">
              {error}
            </div>
          )}

          {step === 1 && (
            <section aria-labelledby="s1">
              <h2 id="s1" className="text-3xl">
                What are we doing today?
              </h2>
              <p className="mt-2 text-slate">Pick one or more. Extras like a facial fit inside the same visit. Up to {MAX_SERVICES_PER_BOOKING}.</p>
              <div className="mt-6 space-y-8">
                {groups.map((g) => (
                  <fieldset key={g.category}>
                    <legend className="mb-3 text-sm font-bold uppercase tracking-wide text-slate">{g.category}</legend>
                    <ul className="grid gap-2.5 sm:grid-cols-2">
                      {g.items.map((s) => {
                        const on = ids.includes(s.id);
                        const blocked = !on && ids.length >= MAX_SERVICES_PER_BOOKING;
                        return (
                          <li key={s.id}>
                            <label
                              className={`flex min-h-[4.5rem] cursor-pointer items-start gap-3 rounded-panel border-2 p-4 transition-colors ${
                                on ? "border-ink bg-white shadow-[0_0_0_1px_var(--color-ink)]" : "border-line bg-white hover:border-ink-3"
                              } ${blocked ? "cursor-not-allowed opacity-50" : ""}`}
                            >
                              <input type="checkbox" className="peer sr-only" checked={on} disabled={blocked} onChange={() => toggle(s.id)} />
                              <span
                                aria-hidden="true"
                                className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-pole-dark ${
                                  on ? "border-ink bg-ink text-white" : "border-line bg-white"
                                }`}
                              >
                                {on && (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                                  </svg>
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-baseline justify-between gap-3">
                                  <span className="font-semibold leading-snug">{s.name}</span>
                                  <span className="font-display font-bold tabular-nums">{formatBDT(s.price)}</span>
                                </span>
                                <span className="mt-0.5 block text-sm leading-snug text-slate">{s.description}</span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </fieldset>
                ))}
              </div>
              {tried && ids.length === 0 && <p className="mt-4 font-semibold text-bad">Choose at least one service to continue.</p>}
            </section>
          )}

          {step === 2 && (
            <section aria-labelledby="s2">
              <h2 id="s2" className="text-3xl">
                Pick a day and time
              </h2>
              <p className="mt-2 text-slate">Greyed-out times are taken. We assign whichever barber is free, and you&apos;ll see their name once you&apos;ve booked.</p>
              <div className="mt-6">
                <SlotPicker
                  date={date}
                  time={time}
                  refreshKey={refreshKey}
                  nearTime={lostTime}
                  onSelect={(d, t) => {
                    setDate(d);
                    setTime(t);
                    if (t) setLostTime(null);
                    setError(null);
                  }}
                />
              </div>
              {tried && !time && <p className="mt-2 font-semibold text-bad">Choose a time to continue.</p>}
            </section>
          )}

          {step === 3 && (
            <section aria-labelledby="s3">
              <h2 id="s3" className="text-3xl">
                Who&apos;s it for?
              </h2>
              <p className="mt-2 text-slate">Just your name and mobile number. No account needed.</p>
              <div className="mt-6 grid max-w-md gap-5">
                <div>
                  <label htmlFor="name" className={label}>
                    Your name
                  </label>
                  <input
                    id="name"
                    className={field}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    maxLength={60}
                    aria-invalid={tried && !nameOk}
                    aria-describedby={tried && !nameOk ? "name-err" : undefined}
                  />
                  {tried && !nameOk && (
                    <p id="name-err" className="mt-1.5 text-sm font-semibold text-bad">
                      Enter your name.
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="phone" className={label}>
                    Mobile number
                  </label>
                  <input
                    id="phone"
                    className={field}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="01712 345 678"
                    aria-invalid={tried && !normalized}
                    aria-describedby="phone-hint"
                  />
                  <p id="phone-hint" className={`mt-1.5 text-sm ${tried && !normalized ? "font-semibold text-bad" : "text-slate"}`}>
                    {tried && !normalized ? "That doesn't look right. Use a Bangladesh mobile number like 01712 345 678." : "We use it to find your booking. We won't send spam."}
                  </p>
                </div>
                {!user && (
                  <p className="text-sm text-slate">
                    Have an account?{" "}
                    <Link href="/login?next=/book" className="font-semibold text-pole-dark underline underline-offset-4">
                      Sign in
                    </Link>{" "}
                    to keep all your bookings in one place.
                  </p>
                )}
              </div>
            </section>
          )}

          {step === 4 && (
            <section aria-labelledby="s4">
              <h2 id="s4" className="text-3xl">
                Check and confirm
              </h2>
              <p className="mt-2 text-slate">One last look. You can change or cancel online up to 2 hours before your visit.</p>
              <div className="mt-6 max-w-md rounded-panel border-2 border-line bg-white p-5">
                {summary}
                <div className="mt-4 border-t border-line pt-4 text-[15px]">
                  <p className="font-semibold">{name.trim()}</p>
                  <p className="text-slate">{normalized}</p>
                </div>
              </div>
              {demoNotice && <p className="mt-4 max-w-md text-sm text-slate">This is a portfolio demo. Bookings made here are not real and are cleared every night.</p>}
            </section>
          )}
        </div>

        {/* Summary: sticky side card on large screens */}
        <aside className="hidden lg:block" aria-label="Your visit">
          <div className="sticky top-24 rounded-panel border-2 border-line bg-white p-5">
            <h2 className="mb-4 text-xl">Your visit</h2>
            {summary}
          </div>
        </aside>
      </div>

      {/* Action bar: pinned to the bottom on phones */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur lg:static lg:mt-8 lg:max-w-[calc(100%-23rem)] lg:border-0 lg:bg-transparent lg:backdrop-blur-none"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-0 lg:py-0">
          {step > 1 && (
            <button type="button" onClick={() => go(step - 1)} disabled={busy} className={`${btn.outline} !px-5`}>
              Back
            </button>
          )}
          <div className="min-w-0 flex-1 lg:hidden">
            <p className="text-xs font-semibold text-slate">Total</p>
            <p className="font-display text-xl font-extrabold leading-none tabular-nums">{formatBDT(total)}</p>
          </div>
          <button type="button" onClick={next} disabled={busy} className={`${btn.primary} min-w-36 lg:min-w-48`}>
            {busy ? "Booking..." : step === 4 ? "Confirm booking" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
