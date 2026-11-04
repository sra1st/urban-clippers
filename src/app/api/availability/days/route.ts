import { json, route } from "@/lib/api";
import { getAvailability } from "@/lib/availability";
import { MAX_DAYS_AHEAD } from "@/lib/config";
import { addDays, nowDhaka } from "@/lib/time";

export const dynamic = "force-dynamic";

// GET /api/availability/days -> one entry per bookable date: is the shop open, and is anything free?
export const GET = route(async () => {
  const today = nowDhaka().date;
  const days = await getAvailability(today, addDays(today, MAX_DAYS_AHEAD));
  return json({
    today,
    days: Object.values(days).map((d) => ({ date: d.date, open: d.open, available: d.slots.some((s) => s.available) })),
  });
});
