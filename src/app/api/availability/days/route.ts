import { json, route } from "@/lib/api";
import { getAvailability } from "@/lib/availability";
import { readOpts } from "@/lib/availability-params";
import { MAX_DAYS_AHEAD } from "@/lib/config";
import { addDays, nowDhaka } from "@/lib/time";

export const dynamic = "force-dynamic";

// GET /api/availability/days -> one entry per bookable date: is the shop open, and is anything free?
export const GET = route(async (req) => {
  const today = nowDhaka().date;
  const { hours, barberId, excludeCode } = readOpts(new URL(req.url).searchParams);
  const days = await getAvailability(today, addDays(today, MAX_DAYS_AHEAD), { hours, barberId, excludeCode });
  return json({
    today,
    days: Object.values(days).map((d) => ({ date: d.date, open: d.open, available: d.slots.some((s) => s.available) })),
  });
});
