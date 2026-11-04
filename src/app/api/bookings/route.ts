import { json, readBody, route } from "@/lib/api";
import { getUser, grantBookingAccess } from "@/lib/auth";
import { createBooking } from "@/lib/engine";
import { clientIp, keyOf, rateLimit } from "@/lib/rate-limit";
import { createBookingSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  await rateLimit("book-ip", clientIp(req), 15, 3600);
  const body = createBookingSchema.parse(await readBody(req));
  await rateLimit("book-phone", keyOf(body.phone), 6, 3600);

  const user = await getUser();
  const booking = await createBooking({
    date: body.date,
    time: body.time,
    serviceIds: body.serviceIds,
    name: body.name,
    phone: body.phone,
    note: body.note,
    userId: user?.id ?? null,
    actor: "client",
  });
  await grantBookingAccess(booking.code);
  return json({ booking }, 201);
});
