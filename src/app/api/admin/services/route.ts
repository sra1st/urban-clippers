import { json, readBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { pool, q, x, type RowDataPacket } from "@/lib/db";
import { serviceSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  await requireAdmin();
  const s = serviceSchema.parse(await readBody(req));
  const [max] = await q<RowDataPacket>(pool, "SELECT COALESCE(MAX(sort_order), 0) AS m FROM services");
  const res = await x(
    pool,
    "INSERT INTO services (category, name, description, price_bdt, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)",
    [s.category, s.name, s.description, s.price, Number(max.m) + 10, s.isActive ? 1 : 0],
  );
  return json({ id: res.insertId }, 201);
});
