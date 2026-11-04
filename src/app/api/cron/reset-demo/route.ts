import { timingSafeEqual } from "node:crypto";
import { json, route } from "@/lib/api";
import { resetDemo } from "@/lib/demo-reset";
import { BookingError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Called nightly by .github/workflows/reset-demo.yml. Wipes visitor data and restores the demo schedule.
export const POST = route(async (req) => {
  if (!process.env.CRON_SECRET) throw new BookingError("FORBIDDEN", "CRON_SECRET is not configured.");
  if (!authorized(req)) throw new BookingError("FORBIDDEN", "Not allowed.");
  const result = await resetDemo();
  return json({ ok: true, ...result });
});
