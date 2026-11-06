import type { Metadata } from "next";
import Link from "next/link";
import { BookingActions } from "@/components/BookingActions";
import { StatusBadge } from "@/components/StatusBadge";
import { UnlockBooking } from "@/components/UnlockBooking";
import { canManageBooking } from "@/lib/auth";
import { getBookingByCode } from "@/lib/bookings";
import { CANCEL_CUTOFF_MINUTES, SLOT_MINUTES } from "@/lib/config";
import { hoursLabel } from "@/lib/duration";
import { prettyPhone } from "@/lib/phone";
import { mapsUrl, SITE } from "@/lib/site";
import { addHoursTo, dhakaEpoch, formatBDT, formatDayLong, formatTime12 } from "@/lib/time";
import { btn } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your booking" };

const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export default async function BookingPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ new?: string }> }) {
  const { code } = await params;
  const { new: isNew } = await searchParams;
  const booking = await getBookingByCode(code);

  // Same screen whether the code doesn't exist or isn't yours: nobody can probe for valid codes.
  if (!booking || !(await canManageBooking(booking))) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
        <h1 className="text-4xl">Find your booking</h1>
        <p className="mb-8 mt-3 text-slate">Enter the phone number you booked with to see the details, change the time or cancel.</p>
        <UnlockBooking code={code.toUpperCase()} compact />
      </div>
    );
  }

  const start = dhakaEpoch(booking.date, booking.time);
  const end = start + booking.hours * SLOT_MINUTES * 60_000;
  const where = `${SITE.name}, ${SITE.addressLines.join(", ")}`;
  const names = booking.services.map((s) => s.name).join(", ");
  const when = `${formatDayLong(booking.date)}, ${formatTime12(booking.time)}`;
  const links = {
    ics: `/api/bookings/${booking.code}/ics`,
    google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${SITE.name} (${booking.code})`)}&dates=${stamp(start)}/${stamp(end)}&details=${encodeURIComponent(`${names}. Your barber: ${booking.barberName}.`)}&location=${encodeURIComponent(where)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`I'm booked at ${SITE.name}: ${when}. Booking ${booking.code}.`)}`,
    maps: mapsUrl,
    phoneHref: SITE.phoneHref,
    phone: SITE.phone,
  };
  const fresh = isNew === "1" && booking.status === "booked";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex items-center gap-4">
        {fresh && (
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-ok text-white">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path className="tick-draw" d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
        )}
        <div>
          <h1 className="text-4xl sm:text-5xl">{fresh ? "You're booked." : "Your booking"}</h1>
          {fresh && <p className="mt-1 text-slate">Save your code. It&apos;s the quickest way back to this page.</p>}
        </div>
      </div>

      <article className="overflow-hidden rounded-panel border-2 border-ink bg-white">
        <div className="pole-band h-2" aria-hidden="true" />
        <div className="grid gap-6 p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StatusBadge status={booking.status} />
            <p className="text-sm text-slate">
              Code <span className="font-display text-lg font-extrabold tracking-wider text-ink">{booking.code}</span>
            </p>
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-slate">When</p>
            <p className="font-display text-3xl font-bold leading-tight">{formatDayLong(booking.date)}</p>
            <p className="font-display text-3xl font-bold leading-tight text-pole-dark">
              {formatTime12(booking.time)} <span className="text-xl text-slate">to {formatTime12(addHoursTo(booking.time, booking.hours))}</span>
            </p>
            <p className="mt-1 text-sm text-slate">Visit length: {hoursLabel(booking.hours)}. Your barber is held for all of it.</p>
          </div>

          <div className="flex items-center gap-4 rounded-control bg-paper p-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-ink font-display text-xl font-extrabold text-white" aria-hidden="true">
              {booking.barberName.slice(0, 1)}
            </span>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-slate">Your barber</p>
              <p className="text-xl font-bold">{booking.barberName}</p>
              <p className="text-sm text-slate">{booking.barberRequested ? "Your choice" : "Assigned to you"}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-wide text-slate">Services</p>
            <ul className="divide-y divide-line">
              {booking.services.map((s) => (
                <li key={s.id} className="flex justify-between gap-4 py-2.5">
                  <span>{s.name}</span>
                  <span className="font-semibold tabular-nums">{formatBDT(s.price)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1 flex items-baseline justify-between border-t-2 border-ink pt-3">
              <span className="font-bold">Total</span>
              <span className="font-display text-2xl font-extrabold tabular-nums">{formatBDT(booking.total)}</span>
            </p>
            <p className="mt-1 text-sm text-slate">Pay at the studio: cash, card, bKash or Nagad.</p>
          </div>

          <p className="text-sm text-slate">
            Booked for {booking.name}
            {booking.phone !== "-" && <> &middot; {prettyPhone(booking.phone)}</>}
          </p>
        </div>
      </article>

      <div className="mt-8">
        <BookingActions
          code={booking.code}
          status={booking.status}
          canChange={booking.canChange}
          cutoffHours={CANCEL_CUTOFF_MINUTES / 60}
          links={links}
          hours={booking.hours}
          barberId={booking.barberRequested ? booking.barberId : null}
          barberName={booking.barberName}
        />
      </div>

      {(booking.status === "cancelled" || booking.status === "completed" || booking.status === "no_show") && (
        <div className="mt-8">
          <Link href="/book" className={btn.primary}>
            Book another visit
          </Link>
        </div>
      )}

      <p className="mt-10 text-sm text-slate">
        Please arrive 5 minutes early. We hold your chair for 15 minutes after your start time. {SITE.addressLines.join(", ")}.
      </p>
    </div>
  );
}
