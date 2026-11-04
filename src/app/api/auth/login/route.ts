import bcrypt from "bcryptjs";
import { json, readBody, route } from "@/lib/api";
import { startSession, verifyPassword } from "@/lib/auth";
import { pool, q, type RowDataPacket } from "@/lib/db";
import { BookingError } from "@/lib/errors";
import { clientIp, keyOf, rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

// A real bcrypt hash, compared when the email is unknown so response time doesn't reveal whether it exists.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

export const POST = route(async (req) => {
  const body = loginSchema.parse(await readBody(req));
  await rateLimit("login-ip", clientIp(req), 30, 900);
  await rateLimit("login-email", keyOf(body.email), 8, 900);

  const rows = await q<RowDataPacket>(pool, "SELECT id, role, password_hash FROM users WHERE email = ?", [body.email]);
  const user = rows[0];
  const ok = await verifyPassword(body.password, user ? String(user.password_hash) : DUMMY_HASH);
  if (!user || !ok) throw new BookingError("AUTH", "Email or password is incorrect.");

  await startSession({ id: Number(user.id), role: String(user.role) });
  return json({ ok: true, role: user.role });
});
