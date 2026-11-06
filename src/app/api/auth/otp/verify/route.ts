import { json, readBody, route } from "@/lib/api";
import { findOrCreateClient } from "@/lib/accounts";
import { startSession } from "@/lib/auth";
import { checkOtp } from "@/lib/otp";
import { clientIp, keyOf, rateLimit } from "@/lib/rate-limit";
import { otpVerifySchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

// Step 2 of phone sign-in: check the code, then sign in (creating the account on first use).
export const POST = route(async (req) => {
  const { phone, code } = otpVerifySchema.parse(await readBody(req));
  await rateLimit("otpv-ip", clientIp(req), 60, 900);
  await rateLimit("otpv-phone", keyOf(phone), 15, 900);
  await checkOtp(phone, code);
  const user = await findOrCreateClient(phone);
  await startSession(user);
  return json({ ok: true, role: "client" });
});
