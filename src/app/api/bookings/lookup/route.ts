import { json, readBody, route } from "@/lib/api";
import { grantBookingAccess } from "@/lib/auth";
import { getBookingByCode } from "@/lib/bookings";
import { BookingError } from "@/lib/errors";
import { clientIp, keyOf, rateLimit } from "@/lib/rate-limit";
import { lookupSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

// Code + phone number unlocks a booking for this browser. The error is identical for "no such code"
// and "wrong phone" so nobody can probe which codes exist.
export const POST = route(async (req) => {
  await rateLimit("lookup-ip", clientIp(req), 20, 900);
  const parsed = lookupSchema.safeParse(await readBody(req));
  const generic = new BookingError("NOT_FOUND", "We couldn't find a booking with that code and phone number.");
  if (!parsed.success) throw generic;

  const code = parsed.data.code.toUpperCase().replace(/\s/g, "");
  await rateLimit("lookup-code", keyOf(code), 8, 900);
  const booking = await getBookingByCode(code);
  if (!booking || booking.phone !== parsed.data.phone) throw generic;

  await grantBookingAccess(booking.code);
  return json({ code: booking.code });
});
