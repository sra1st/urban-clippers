import "server-only";
import { canManageBooking, getUser, grantBookingAccess } from "./auth";
import { type BookingView, getBookingByCode } from "./bookings";
import { BookingError } from "./errors";
import type { Actor } from "./engine";
import { normalizePhone } from "./validators";

/**
 * Decides who may cancel or reschedule a booking:
 *  - an admin (no time limit),
 *  - the signed-in owner, or a guest who already unlocked it with code + phone,
 *  - anyone who sends the matching phone number along with the request.
 */
export async function authorizeManage(code: string, phone?: string): Promise<{ booking: BookingView; actor: Actor }> {
  const booking = await getBookingByCode(code);
  const notFound = new BookingError("NOT_FOUND", "We couldn't find a booking with that code and phone number.");
  if (!booking) throw notFound;

  const user = await getUser();
  if (user?.role === "admin") return { booking, actor: "admin" };
  if (await canManageBooking(booking)) return { booking, actor: "client" };

  const p = phone ? normalizePhone(phone) : null;
  if (p && p === booking.phone) {
    await grantBookingAccess(booking.code);
    return { booking, actor: "client" };
  }
  throw notFound;
}
