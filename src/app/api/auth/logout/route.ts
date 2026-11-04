import { json, route } from "@/lib/api";
import { endSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const POST = route(async () => {
  await endSession();
  return json({ ok: true });
});
