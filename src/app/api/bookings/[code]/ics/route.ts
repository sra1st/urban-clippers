import { SLOT_MINUTES } from "@/lib/config";
import { canManageBooking } from "@/lib/auth";
import { getBookingByCode } from "@/lib/bookings";
import { SITE } from "@/lib/site";
import { dhakaEpoch, formatTime12 } from "@/lib/time";

export const dynamic = "force-dynamic";

const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

// Calendar file for "Add to calendar". Times are converted to UTC so every calendar app agrees.
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const booking = await getBookingByCode(code);
  if (!booking || !(await canManageBooking(booking))) return new Response("Not found", { status: 404 });

  const start = dhakaEpoch(booking.date, booking.time);
  const end = start + SLOT_MINUTES * 60_000;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${SITE.name}//Booking//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${booking.code}@urbanclippers`,
    `DTSTAMP:${stamp(Date.now())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(`${SITE.name} at ${formatTime12(booking.time)}`)}`,
    `DESCRIPTION:${esc(`Booking ${booking.code}. ${booking.services.map((s) => s.name).join(", ")}. Your barber: ${booking.barberName}.`)}`,
    `LOCATION:${esc(`${SITE.name}, ${SITE.addressLines.join(", ")}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${booking.code}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
