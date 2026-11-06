// Delivers the sign-in code. Three modes:
//  - OTP_DEMO_MODE=true: nothing is sent; the code is returned so the page can show it (portfolio demo only).
//  - SMS_WEBHOOK_URL set: POSTs {"to": "+8801712345678", "message": "..."} to your SMS gateway
//    (with "Authorization: Bearer <SMS_WEBHOOK_TOKEN>" if that is set).
//  - otherwise: refuses, so a real deployment never silently pretends to send.
import { BookingError } from "./errors";

export const isDemoOtp = () => process.env.OTP_DEMO_MODE === "true";

/** Returns the code only in demo mode. */
export async function sendOtp(phone: string, code: string): Promise<string | null> {
  if (isDemoOtp()) return code;
  const url = process.env.SMS_WEBHOOK_URL;
  if (!url) throw new BookingError("INVALID", "Text-message sign-in isn't set up yet. Please book as a guest, or call the studio.");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(process.env.SMS_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.SMS_WEBHOOK_TOKEN}` } : {}) },
    body: JSON.stringify({ to: `+88${phone}`, message: `Your Urban Clippers code is ${code}. It expires in 5 minutes.` }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!res || !res.ok) throw new BookingError("INVALID", "We couldn't send the text message. Please try again in a moment.");
  return null;
}
