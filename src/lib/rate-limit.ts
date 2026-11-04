import { createHash } from "node:crypto";
import { pool, q, x, type RowDataPacket } from "./db";
import { BookingError } from "./errors";

/** Hash anything user-supplied so keys stay short and never hold raw emails or phone numbers. */
export function keyOf(...parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-nf-client-connection-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/**
 * Fixed-window limiter stored in MySQL, so it works across serverless instances.
 * Throws RATE_LIMITED when `limit` hits inside `windowSec` seconds is exceeded.
 */
export async function rateLimit(bucket: string, id: string, limit: number, windowSec: number): Promise<void> {
  const key = `${bucket}:${id}`.slice(0, 120);
  const windowStart = Math.floor(Date.now() / 1000 / windowSec) * windowSec;
  await x(pool, "INSERT INTO rate_limits (key_name, window_start, hits) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE hits = hits + 1", [key, windowStart]);
  const rows = await q<RowDataPacket>(pool, "SELECT hits FROM rate_limits WHERE key_name = ? AND window_start = ?", [key, windowStart]);
  if (Number(rows[0]?.hits ?? 0) > limit) {
    throw new BookingError("RATE_LIMITED", "Too many attempts. Please wait a few minutes and try again.");
  }
}

/** Housekeeping: drop expired windows. Called by the nightly reset. */
export async function pruneRateLimits(): Promise<void> {
  const cutoff = Math.floor(Date.now() / 1000) - 2 * 86400;
  await x(pool, "DELETE FROM rate_limits WHERE window_start < ?", [cutoff]);
}
