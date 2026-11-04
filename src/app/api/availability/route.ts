import { json, route } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { findNext, getAvailability } from "@/lib/availability";
import { MAX_DAYS_AHEAD } from "@/lib/config";
import { BookingError } from "@/lib/errors";
import { addDays, formatTime12, isValidDate, nowDhaka } from "@/lib/time";

export const dynamic = "force-dynamic";

// GET /api/availability?date=YYYY-MM-DD
// Returns every start time for the day with an available flag, plus the next free time if the day is full.
export const GET = route(async (req) => {
  const params = new URL(req.url).searchParams;
  const date = params.get("date") ?? "";
  if (!isValidDate(date)) throw new BookingError("INVALID", "Choose a valid date.");
  const today = nowDhaka().date;
  const last = addDays(today, MAX_DAYS_AHEAD);
  if (date < today || date > last) throw new BookingError("INVALID", `Bookings open up to ${MAX_DAYS_AHEAD} days ahead.`);

  // ?admin=1 only takes effect for a signed-in admin: walk-ins may use the current hour.
  const admin = params.get("admin") === "1" && (await getUser().catch(() => null))?.role === "admin";
  const days = await getAvailability(today, last, { admin });
  const day = days[date];
  const anyFree = day.slots.some((s) => s.available);
  const next = anyFree ? null : findNext(days, date);
  return json({
    date,
    open: day.open,
    slots: day.slots.map((s) => ({ ...s, label: formatTime12(s.time) })),
    next: next ? { ...next, label: formatTime12(next.time) } : null,
  });
});
