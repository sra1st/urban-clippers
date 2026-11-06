// One-time sign-in codes. Only a keyed hash of each code is stored; codes expire and allow a few tries.
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { pool, q, withTx, x, type RowDataPacket } from "./db";
import { BookingError } from "./errors";

export const OTP_TTL_MS = 5 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_MS = 30_000;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters.");
  return s;
}

const hashCode = (phone: string, code: string) => createHmac("sha256", secret()).update(`${phone}:${code}`).digest("hex");

/** Creates (and stores the hash of) a fresh 6-digit code for this phone. Returns the plain code to send. */
export async function issueOtp(phone: string): Promise<string> {
  const now = Date.now();
  const [existing] = await q<RowDataPacket>(pool, "SELECT sent_at FROM otp_codes WHERE phone = ?", [phone]);
  if (existing && now - Number(existing.sent_at) < OTP_RESEND_MS) {
    throw new BookingError("RATE_LIMITED", "A code was just sent. Please wait a few seconds before asking for another.");
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await x(
    pool,
    `INSERT INTO otp_codes (phone, code_hash, expires_at, sent_at, attempts) VALUES (?, ?, ?, ?, 0)
     ON DUPLICATE KEY UPDATE code_hash = VALUES(code_hash), expires_at = VALUES(expires_at), sent_at = VALUES(sent_at), attempts = 0`,
    [phone, hashCode(phone, code), now + OTP_TTL_MS, now],
  );
  return code;
}

/** Checks a code. Resolves on success (the code is then used up); throws a friendly BookingError otherwise. */
export async function checkOtp(phone: string, code: string): Promise<void> {
  const bad = new BookingError("AUTH", "That code isn't right or has expired. Request a new one.");
  let failure: BookingError | null = null;
  await withTx(async (conn) => {
    const [row] = await q<RowDataPacket>(conn, "SELECT code_hash, expires_at, attempts FROM otp_codes WHERE phone = ? FOR UPDATE", [phone]);
    if (!row || Number(row.expires_at) < Date.now() || Number(row.attempts) >= OTP_MAX_ATTEMPTS) {
      failure = bad;
      return;
    }
    const a = Buffer.from(String(row.code_hash), "hex");
    const b = Buffer.from(hashCode(phone, code), "hex");
    if (a.length === b.length && timingSafeEqual(a, b)) {
      await x(conn, "DELETE FROM otp_codes WHERE phone = ?", [phone]);
      return;
    }
    await x(conn, "UPDATE otp_codes SET attempts = attempts + 1 WHERE phone = ?", [phone]);
    const left = OTP_MAX_ATTEMPTS - Number(row.attempts) - 1;
    failure = left > 0 ? new BookingError("AUTH", `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.`) : bad;
  });
  if (failure) throw failure;
}
