import type { BookingStatus } from "@/lib/bookings";

const MAP: Record<BookingStatus, { text: string; cls: string }> = {
  booked: { text: "Confirmed", cls: "bg-[#e2f3ea] text-ok" },
  completed: { text: "Completed", cls: "bg-mist text-ink-3" },
  cancelled: { text: "Cancelled", cls: "bg-[#fbe5e3] text-bad" },
  no_show: { text: "Missed", cls: "bg-[#fbeed2] text-[#7a4f00]" },
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const s = MAP[status];
  return <span className={`inline-flex items-center rounded-chip px-3 py-1 text-sm font-bold ${s.cls}`}>{s.text}</span>;
}
