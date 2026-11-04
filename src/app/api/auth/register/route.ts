import { json, readBody, route } from "@/lib/api";
import { hashPassword, startSession } from "@/lib/auth";
import { pool, q, isDuplicate, x, type RowDataPacket } from "@/lib/db";
import { BookingError } from "@/lib/errors";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  await rateLimit("register-ip", clientIp(req), 10, 3600);
  const body = registerSchema.parse(await readBody(req));

  const existing = await q<RowDataPacket>(pool, "SELECT id FROM users WHERE email = ?", [body.email]);
  const taken = new BookingError("CONFLICT", "An account with this email already exists. Sign in instead.");
  if (existing.length > 0) throw taken;

  let id: number;
  try {
    const res = await x(pool, "INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'client')", [
      body.name,
      body.email,
      body.phone || "",
      await hashPassword(body.password),
    ]);
    id = res.insertId;
  } catch (err) {
    if (isDuplicate(err)) throw taken;
    throw err;
  }
  await startSession({ id, role: "client" });
  return json({ ok: true }, 201);
});
