import Link from "next/link";
import { getHoursSafe } from "@/lib/data";
import { hoursLines } from "@/lib/hours-format";
import { SITE } from "@/lib/site";
import { Logo } from "./Header";

export async function Footer() {
  const lines = hoursLines(await getHoursSafe());
  return (
    <footer className="bg-ink pb-28 pt-14 text-white md:pb-10">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-white/70">Cuts, shaves and facials. Open every night, with online booking that shows you the real free times.</p>
        </div>
        <div>
          <h2 className="mb-3 text-base font-bold">Hours</h2>
          <ul className="space-y-1 text-white/75">
            {lines.map((l) => (
              <li key={l.days}>
                {l.days}: {l.hours}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-base font-bold">Visit</h2>
          <address className="space-y-1 not-italic text-white/75">
            {SITE.addressLines.map((l) => (
              <div key={l}>{l}</div>
            ))}
            <a href={SITE.phoneHref} className="block pt-1 font-semibold text-white hover:underline">
              {SITE.phone}
            </a>
          </address>
        </div>
        <div>
          <h2 className="mb-3 text-base font-bold">Explore</h2>
          <ul className="space-y-1 text-white/75">
            {[
              ["/book", "Book a slot"],
              ["/services", "Services and prices"],
              ["/find-booking", "Find my booking"],
              ["/gallery", "Gallery"],
              ["/location", "Location"],
              ["/contact", "Contact"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="hover:text-white hover:underline">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-6xl border-t border-white/10 px-4 pt-6 text-sm text-white/55 sm:px-6">
        <p>
          &copy; {new Date().getFullYear()} {SITE.name}.
          {SITE.demoNotice && " Portfolio demo project: bookings are not real and data resets daily."}
        </p>
      </div>
    </footer>
  );
}
