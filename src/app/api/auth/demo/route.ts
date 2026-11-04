import { z } from "zod";
import { json, readBody, route } from "@/lib/api";
import { startSession } from "@/lib/auth";
import { pool, q, type RowDataPacket } from "@/lib/db";
import { BookingError } from "@/lib/errors";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({ role: z.enum(["client", "admin"]) });

// One-click demo sign-in. Only the accounts flagged is_demo can be entered this way.
export const POST = route(async (req) => {
  await rateLimit("demo-ip", clientIp(req), 40, 3600);
  const { role } = schema.parse(await readBody(req));
  const rows = await q<RowDataPacket>(pool, "SELECT id, role FROM users WHERE is_demo = 1 AND role = ? ORDER BY id LIMIT 1", [role]);
  const user = rows[0];
  if (!user) throw new BookingError("NOT_FOUND", "The demo accounts aren't set up yet. Run npm run db:setup.");
  await startSession({ id: Number(user.id), role: String(user.role) });
  return json({ ok: true, role });
});
