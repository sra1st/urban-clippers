import { json } from "@/lib/api";
import { pool, q } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await q(pool, "SELECT 1 AS ok");
    return json({ ok: true });
  } catch {
    return json({ ok: false }, 503);
  }
}
