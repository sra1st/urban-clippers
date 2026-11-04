import { json, readBody, route } from "@/lib/api";
import { cancelBooking } from "@/lib/engine";
import { authorizeManage } from "@/lib/manage";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export const POST = route<{ code: string }>(async (req, { params }) => {
  const { code } = await params;
  await rateLimit("manage-ip", clientIp(req), 30, 900);
  const body = (await readBody(req).catch(() => ({}))) as { phone?: string };
  const { actor } = await authorizeManage(code, body.phone);
  const booking = await cancelBooking(code, actor);
  return json({ booking });
});
