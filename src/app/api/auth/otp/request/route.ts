import { json, readBody, route } from "@/lib/api";
import { issueOtp } from "@/lib/otp";
import { clientIp, keyOf, rateLimit } from "@/lib/rate-limit";
import { sendOtp } from "@/lib/sms";
import { otpRequestSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

// Step 1 of phone sign-in: text a 6-digit code to the number.
export const POST = route(async (req) => {
  const { phone } = otpRequestSchema.parse(await readBody(req));
  await rateLimit("otp-ip", clientIp(req), 20, 3600);
  await rateLimit("otp-phone", keyOf(phone), 5, 3600); // caps SMS cost and harassment of one number
  const code = await issueOtp(phone);
  const demoCode = await sendOtp(phone, code);
  return json({ ok: true, ...(demoCode ? { demoCode } : {}) });
});
