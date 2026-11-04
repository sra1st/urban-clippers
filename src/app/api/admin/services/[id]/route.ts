import { json, readBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { pool, x } from "@/lib/db";
import { BookingError } from "@/lib/errors";
import { serviceSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

// Services are never deleted: hiding one (isActive = false) keeps old bookings intact.
export const PATCH = route<{ id: string }>(async (req, { params }) => {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) throw new BookingError("INVALID", "Invalid service.");
  const s = serviceSchema.parse(await readBody(req));
  const res = await x(
    pool,
    "UPDATE services SET category = ?, name = ?, description = ?, price_bdt = ?, is_active = ? WHERE id = ?",
    [s.category, s.name, s.description, s.price, s.isActive ? 1 : 0, id],
  );
  if (res.affectedRows === 0) throw new BookingError("NOT_FOUND", "Service not found.");
  return json({ ok: true });
});
