import Link from "next/link";
import type { BookingView } from "@/lib/bookings";
import { formatBDT, formatDay, formatTime12 } from "@/lib/time";
import { StatusBadge } from "./StatusBadge";

/** One booking as a tappable card (My bookings page). */
export function BookingRow({ b }: { b: BookingView }) {
  return (
    <Link href={`/booking/${b.code}`} className="block rounded-panel border-2 border-line bg-white p-4 transition-colors hover:border-ink sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-bold leading-tight">
            {formatDay(b.date)}, {formatTime12(b.time)}
          </p>
          <p className="mt-1 text-slate">{b.services.map((s) => s.name).join(", ")}</p>
        </div>
        <StatusBadge status={b.status} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate">
        <span>
          With <strong className="text-ink">{b.barberName}</strong> &middot; {b.code}
        </span>
        <span className="font-semibold tabular-nums text-ink">{formatBDT(b.total)}</span>
      </div>
    </Link>
  );
}
