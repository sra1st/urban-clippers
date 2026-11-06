import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingRow } from "@/components/BookingRow";
import { SignOutButton } from "@/components/SignOutButton";
import { btn } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { listUserBookings } from "@/lib/bookings";
import { prettyPhone } from "@/lib/phone";
import { minutesUntil } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My bookings" };

export default async function AccountPage() {
  const user = await getUser().catch(() => null);
  if (!user) redirect("/login?next=/account");
  if (user.role === "admin") redirect("/admin");

  const all = await listUserBookings(user.id);
  const upcoming = all.filter((b) => b.status === "booked" && minutesUntil(b.date, b.time) > -60).reverse();
  const past = all.filter((b) => !upcoming.includes(b));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl">My bookings</h1>
          <p className="mt-2 text-slate">
            {user.name || prettyPhone(user.phone)}
            {user.isDemo && <span className="ml-2 rounded-chip bg-ink px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white">Demo account</span>}
          </p>
        </div>
        <SignOutButton className="min-h-11 rounded-control px-3 font-semibold text-slate hover:bg-mist hover:text-ink" />
      </div>

      <section className="mt-10" aria-labelledby="up">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="up" className="text-2xl">
            Upcoming
          </h2>
          <Link href="/book" className={`${btn.primary} !min-h-10 !px-4 !py-2 text-[15px]`}>
            Book a slot
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="rounded-panel border-2 border-dashed border-line bg-white p-6 text-slate">Nothing booked yet. Pick a time and we&apos;ll hold your chair.</p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((b) => (
              <li key={b.id}>
                <BookingRow b={b} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="mt-12" aria-labelledby="past">
          <h2 id="past" className="mb-4 text-2xl">
            Past
          </h2>
          <ul className="space-y-3">
            {past.map((b) => (
              <li key={b.id}>
                <BookingRow b={b} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
