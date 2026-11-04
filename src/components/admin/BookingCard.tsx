"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BookingView } from "@/lib/bookings";
import { prettyPhone } from "@/lib/phone";
import { formatBDT, formatDay, formatTime12 } from "@/lib/time";
import { StatusBadge } from "../StatusBadge";

const small = "inline-flex min-h-10 items-center justify-center rounded-control px-3.5 text-sm font-semibold transition-colors disabled:opacity-50";

/** One booking on the admin schedule: status buttons, and a barber reassign menu. */
export function BookingCard({
  b,
  barbers,
  showDate = false,
}: {
  b: BookingView;
  barbers: { id: number; name: string; off: boolean }[];
  showDate?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function patch(body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setConfirmCancel(false);
        router.refresh();
      } else setError(data.error ?? "Couldn't update this booking.");
    } catch {
      setError("Couldn't reach the server.");
    }
    setBusy(false);
  }

  const active = b.status === "booked";
  const muted = b.status === "cancelled";

  return (
    <article className={`rounded-panel border-2 bg-white p-4 ${active ? "border-line" : "border-transparent"} ${muted ? "opacity-70" : ""}`} aria-label={`${b.name}, ${formatTime12(b.time)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-bold leading-none tabular-nums">{formatTime12(b.time)}</p>
          {showDate && <p className="mt-1 text-sm font-semibold text-slate">{formatDay(b.date)}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {b.source === "walkin" && <span className="rounded-chip bg-mist px-2.5 py-1 text-xs font-bold text-ink-3">Walk-in</span>}
          <StatusBadge status={b.status} />
        </div>
      </div>

      <div className="mt-3">
        <p className="font-semibold">{b.name}</p>
        {b.phone !== "-" && (
          <a href={`tel:+88${b.phone}`} className="text-[15px] text-pole-dark underline underline-offset-2">
            {prettyPhone(b.phone)}
          </a>
        )}
        <p className="mt-1 text-[15px] text-slate">{b.services.map((s) => s.name).join(", ")}</p>
        <p className="mt-1 flex items-center justify-between text-sm text-slate">
          <span>
            {showDate && <span className="mr-2 font-semibold text-ink">{b.barberName}</span>}
            {b.code}
          </span>
          <span className="font-semibold tabular-nums text-ink">{formatBDT(b.total)}</span>
        </p>
      </div>

      {active && (
        <div className="mt-3 space-y-2.5 border-t border-line pt-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => patch({ status: "completed" })} className={`${small} bg-ok text-white hover:bg-[#186039]`}>
              Done
            </button>
            <button type="button" disabled={busy} onClick={() => patch({ status: "no_show" })} className={`${small} border-2 border-line hover:border-ink`}>
              No-show
            </button>
            {confirmCancel ? (
              <>
                <button type="button" disabled={busy} onClick={() => patch({ status: "cancelled" })} className={`${small} bg-bad text-white hover:bg-[#8f1e18]`}>
                  Confirm cancel
                </button>
                <button type="button" disabled={busy} onClick={() => setConfirmCancel(false)} className={`${small} hover:bg-mist`}>
                  Keep
                </button>
              </>
            ) : (
              <button type="button" disabled={busy} onClick={() => setConfirmCancel(true)} className={`${small} text-bad hover:bg-[#fbe5e3]`}>
                Cancel
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate">
            <span className="shrink-0">Barber</span>
            <select
              className="min-h-10 min-w-0 flex-1 rounded-control border-2 border-line bg-white px-2 text-[15px] font-semibold text-ink"
              value={b.barberId}
              disabled={busy}
              onChange={(e) => patch({ barberId: Number(e.target.value) })}
            >
              {barbers.map((x) => (
                <option key={x.id} value={x.id} disabled={x.off && x.id !== b.barberId}>
                  {x.name}
                  {x.off ? " (off today)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-bad">
          {error}
        </p>
      )}
    </article>
  );
}
