import { z } from "zod";
import { json, readBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { reassignBooking, setBookingStatus } from "@/lib/engine";
import { BookingError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const schema = z.union([
  z.object({ status: z.enum(["completed", "no_show", "cancelled"]) }),
  z.object({ barberId: z.number().int().positive() }),
]);

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) throw new BookingError("INVALID", "Invalid booking.");
  const body = schema.parse(await readBody(req));
  const booking = "status" in body ? await setBookingStatus(id, body.status) : await reassignBooking(id, body.barberId);
  return json({ booking });
});
