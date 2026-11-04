import { json, readBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { createBooking } from "@/lib/engine";
import { walkInSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

// Walk-in booking from the admin panel. Uses the same transaction and UNIQUE guard as online bookings.
export const POST = route(async (req) => {
  await requireAdmin();
  const body = walkInSchema.parse(await readBody(req));
  const booking = await createBooking({
    date: body.date,
    time: body.time,
    serviceIds: body.serviceIds,
    name: body.name,
    phone: body.phone || "-",
    actor: "admin",
    source: "walkin",
  });
  return json({ booking }, 201);
});
