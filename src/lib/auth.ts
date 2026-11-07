import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { pool, q, type RowDataPacket } from "./db";
import { BookingError } from "./errors";

const SESSION_COOKIE = "uc_session";
const ACCESS_COOKIE = "uc_access";
const isProd = process.env.NODE_ENV === "production";

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters.");
  return new TextEncoder().encode(s);
}

export type SessionUser = {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  role: "client" | "admin";
};

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export async function startSession(user: { id: number; role: string }): Promise<void> {
  const token = await new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: isProd, path: "/", maxAge: 7 * 86400 });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in user, re-checked against the database on every request (so deleted users are signed out). */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    if (!Number.isInteger(id)) return null;
    const rows = await q<RowDataPacket>(pool, "SELECT id, name, email, phone, role FROM users WHERE id = ?", [id]);
    const u = rows[0];
    if (!u) return null;
    return { id: Number(u.id), name: String(u.name), email: u.email === null ? null : String(u.email), phone: u.phone === null ? "" : String(u.phone), role: u.role === "admin" ? "admin" : "client" };
  } catch {
    return null;
  }
});

export async function requireAdmin(): Promise<SessionUser> {
  const u = await getUser();
  if (!u || u.role !== "admin") throw new BookingError("AUTH", "Admin sign-in required.");
  return u;
}

// ---- Guest access to a booking page ------------------------------------------------------------
// A guest proves they own a booking by entering its code and phone number once. We then remember
// that in a signed cookie so the booking page works without putting the phone number in a URL.

async function readAccess(): Promise<string[]> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return [];
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return Array.isArray(payload.codes) ? (payload.codes as string[]) : [];
  } catch {
    return [];
  }
}

export async function grantBookingAccess(code: string): Promise<void> {
  const codes = [code, ...(await readAccess()).filter((c) => c !== code)].slice(0, 8);
  const token = await new SignJWT({ codes }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(secret());
  (await cookies()).set(ACCESS_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: isProd, path: "/", maxAge: 30 * 86400 });
}

export const hasBookingAccess = async (code: string): Promise<boolean> => (await readAccess()).includes(code);

/** True when the visitor may view or manage this booking. */
export async function canManageBooking(booking: { code: string; userId: number | null }): Promise<boolean> {
  const user = await getUser();
  if (user?.role === "admin") return true;
  if (user && booking.userId === user.id) return true;
  return hasBookingAccess(booking.code);
}
