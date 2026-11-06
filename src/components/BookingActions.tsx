"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDayLong, formatTime12 } from "@/lib/time";
import { SlotPicker } from "./SlotPicker";
import { btn } from "./ui";

type Links = { ics: string; google: string; whatsapp: string; maps: string; phoneHref: string; phone: string };

const Icon = ({ d }: { d: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

export function BookingActions({
  code,
  status,
  canChange,
  cutoffHours,
  links,
  hours,
  barberId,
  barberName,
}: {
  code: string;
  status: string;
  canChange: boolean;
  cutoffHours: number;
  links: Links;
  hours: number;
  /** Set only when the customer chose this barber: rescheduling then stays with them. */
  barberId: number | null;
  barberName: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "reschedule" | "cancel">("idle");
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lost, setLost] = useState<string | null>(null);

  async function call(path: string, body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${code}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      if (res.ok) return true;
      if (data.code === "SLOT_TAKEN") {
        setLost(time);
        setTime(null);
        setRefreshKey((k) => k + 1);
      }
      setError(data.error ?? "Something went wrong. Please try again.");
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
    return false;
  }

  const link = `${btn.outline} !min-h-11 !px-4 !py-2.5 text-[15px]`;
  const active = status === "booked";

  return (
    <div className="space-y-6">
      {notice && (
        <p role="status" className="rounded-panel border-2 border-ok bg-white p-4 font-semibold text-ok">
          {notice}
        </p>
      )}

      {active && (
        <div className="flex flex-wrap gap-2.5">
          <a href={links.ics} className={link}>
            <Icon d="M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
            Add to calendar
          </a>
          <a href={links.google} target="_blank" rel="noopener noreferrer" className={link}>
            Google Calendar
          </a>
          <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className={link}>
            <Icon d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.7-5.4A8.4 8.4 0 1 1 21 11.5z" />
            Share on WhatsApp
          </a>
          <a href={links.maps} target="_blank" rel="noopener noreferrer" className={link}>
            <Icon d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
            Directions
          </a>
        </div>
      )}

      {active && !canChange && (
        <p className="rounded-panel border-2 border-line bg-white p-4 text-slate">
          Online changes close {cutoffHours} hours before your visit. To change or cancel now, please call{" "}
          <a href={links.phoneHref} className="font-semibold text-ink underline underline-offset-4">
            {links.phone}
          </a>
          .
        </p>
      )}

      {active && canChange && mode === "idle" && (
        <div className="flex flex-wrap gap-2.5 border-t border-line pt-6">
          <button type="button" className={btn.dark} onClick={() => { setMode("reschedule"); setNotice(null); }}>
            Reschedule
          </button>
          <button type="button" className={btn.quiet} onClick={() => { setMode("cancel"); setNotice(null); }}>
            Cancel booking
          </button>
        </div>
      )}

      {mode === "cancel" && (
        <div role="group" aria-label="Cancel booking" className="rounded-panel border-2 border-bad bg-white p-5">
          <p className="font-bold">Cancel this booking?</p>
          <p className="mt-1 text-slate">Your chair will be released for someone else.</p>
          {error && <p role="alert" className="mt-3 font-semibold text-bad">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={busy}
              className={`${btn.dark} !bg-bad hover:!bg-[#8f1e18]`}
              onClick={async () => {
                if (await call("cancel", {})) {
                  setMode("idle");
                  router.refresh();
                }
              }}
            >
              {busy ? "Cancelling..." : "Yes, cancel it"}
            </button>
            <button type="button" className={btn.outline} onClick={() => { setMode("idle"); setError(null); }}>
              Keep my booking
            </button>
          </div>
        </div>
      )}

      {mode === "reschedule" && (
        <div role="group" aria-label="Reschedule booking" className="rounded-panel border-2 border-ink bg-white p-5">
          <h2 className="text-2xl">Pick a new time</h2>
          <p className="mb-5 mt-1 text-slate">{barberId ? `Showing ${barberName}'s free times, since you chose ${barberName}.` : "We'll keep your services and try to keep the same barber."} Your visit takes {hours === 1 ? "1 hour" : `${hours} hours`}.</p>
          {error && <p role="alert" className="mb-4 rounded-control border-2 border-bad p-3 font-semibold text-bad">{error}</p>}
          <SlotPicker hours={hours} barberId={barberId} excludeCode={code} date={date} time={time} refreshKey={refreshKey} nearTime={lost} onSelect={(d, t) => { setDate(d); setTime(t); setError(null); }} />
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={busy || !date || !time}
              className={btn.primary}
              onClick={async () => {
                if (!date || !time) return;
                if (await call("reschedule", { date, time })) {
                  setNotice(`Rescheduled to ${formatDayLong(date)}, ${formatTime12(time)}.`);
                  setMode("idle");
                  setDate(null);
                  setTime(null);
                  router.refresh();
                }
              }}
            >
              {busy ? "Saving..." : date && time ? `Move to ${formatTime12(time)}` : "Choose a time"}
            </button>
            <button type="button" className={btn.quiet} onClick={() => { setMode("idle"); setError(null); }}>
              Never mind
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
