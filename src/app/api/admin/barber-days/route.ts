import { z } from "zod";
import { json, readBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { setBarberOff } from "@/lib/engine";

export const dynamic = "force-dynamic";

const schema = z.object({
  barberId: z.number().int().positive(),
  date: z.string(),
  off: z.boolean(),
  resolve: z.enum(["reassign", "cancel"]).optional(),
});

// Check or uncheck a barber for one date. If bookings exist, the response is 409 with the affected list
// until the admin chooses to reassign or cancel them.
export const PUT = route(async (req) => {
  await requireAdmin();
  const body = schema.parse(await readBody(req));
  const affected = await setBarberOff(body.barberId, body.date, body.off, body.resolve);
  return json({ ok: true, affected });
});
