import { json, readBody, route } from "@/lib/api";
import { rescheduleBooking } from "@/lib/engine";
import { authorizeManage } from "@/lib/manage";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rescheduleSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export const POST = route<{ code: string }>(async (req, { params }) => {
  const { code } = await params;
  await rateLimit("manage-ip", clientIp(req), 30, 900);
  const body = rescheduleSchema.parse(await readBody(req));
  const { actor } = await authorizeManage(code, body.phone);
  const booking = await rescheduleBooking(code, body.date, body.time, actor);
  return json({ booking });
});
