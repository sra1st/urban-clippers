import Link from "next/link";
import { Faq } from "@/components/Faq";
import { LiveSlots } from "@/components/LiveSlots";
import { MapGraphic } from "@/components/MapGraphic";
import { OpenNow } from "@/components/OpenNow";
import { Photo } from "@/components/Photo";
import { btn } from "@/components/ui";
import { getHoursSafe, getServicesSafe } from "@/lib/data";
import { hoursLines } from "@/lib/hours-format";
import { mapsUrl, SITE } from "@/lib/site";
import { formatBDT } from "@/lib/time";

export const dynamic = "force-dynamic";

const POPULAR = ["Classic haircut", "Skin fade", "Haircut and beard", "Hot towel shave", "Classic facial", "Groom package"];

const TRUST = [
  { t: "Open every day", d: "10 AM to 11 PM, 7 days a week" },
  { t: "Four barbers", d: "Always a free chair, no long waits" },
  { t: "Pay after your cut", d: "Cash, bKash or Nagad at the studio" },
  { t: "Free changes", d: "Reschedule or cancel up to 2 hours before" },
];

const STEPS = [
  { n: "1", t: "Choose your services", d: "A cut, a beard trim, a facial or a full groom package. Prices are shown up front." },
  { n: "2", t: "Pick a free time", d: "You only see times that are genuinely free. Grey means taken, and it updates live." },
  { n: "3", t: "Get your barber's name", d: "We assign the barber who is free, and your confirmation shows who is waiting for you." },
];

const GALLERY = [
  { name: "gallery-1", alt: "Scissor work on a classic cut" },
  { name: "gallery-2", alt: "Combed and finished style" },
  { name: "gallery-3", alt: "Straight-razor shave" },
  { name: "gallery-4", alt: "The studio's barber pole" },
];

export default async function HomePage() {
  const [services, hours] = await Promise.all([getServicesSafe(), getHoursSafe()]);
  const popular = POPULAR.map((n) => services.find((s) => s.name === n)).filter((s): s is NonNullable<typeof s> => Boolean(s));
  const picks = popular.length >= 3 ? popular : services.slice(0, 6);
  const lines = hoursLines(hours);

  return (
    <>
      {/* Hero */}
      <section className="on-dark bg-ink text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:gap-12 md:py-20">
          <div>
            <OpenNow hours={hours} />
            <h1 className="mt-5 text-[2.9rem] sm:text-6xl lg:text-7xl">
              Sharp cuts.
              <br />
              <span className="text-pole">Real free times.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/80">
              Haircuts, beard trims, hot towel shaves and facials in Dhaka. See which chairs are actually free and book in under a minute.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/book" className={btn.primary}>
                Book your slot
              </Link>
              <Link href="/services" className={btn.outlineLight}>
                See prices
              </Link>
            </div>
            <div className="mt-9">
              <LiveSlots />
            </div>
          </div>
          <div className="relative aspect-[16/11] overflow-hidden rounded-panel bg-ink-2 md:aspect-[4/5]">
            <Photo name="hero" ext="gif" alt="A barber's scissors, comb and razor laid out on the station" priority sizes="(min-width: 768px) 40vw, 100vw" />
            <div className="pole-band absolute inset-y-0 right-0 w-3" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section aria-label="Why people book with us" className="border-b border-line bg-white">
        <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-5 px-4 py-6 sm:px-6 md:grid-cols-4">
          {TRUST.map((t) => (
            <li key={t.t}>
              <p className="font-display text-lg font-bold leading-tight">{t.t}</p>
              <p className="mt-0.5 text-sm text-slate">{t.d}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Popular services */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20" aria-labelledby="pop">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="pop" className="text-4xl sm:text-5xl">
              Most booked
            </h2>
            <p className="mt-2 max-w-xl text-slate">Straight prices in taka. Add extras like a facial or head massage to any visit.</p>
          </div>
          <Link href="/services" className="font-semibold text-pole-dark underline underline-offset-4">
            All services and prices
          </Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {picks.map((s) => (
            <li key={s.id} className="flex flex-col rounded-panel border-2 border-line bg-white p-5">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-xl">{s.name}</h3>
                <p className="font-display text-xl font-bold tabular-nums">{formatBDT(s.price)}</p>
              </div>
              <p className="mt-2 flex-1 text-[15px] text-slate">{s.description}</p>
              <Link href={`/book?service=${s.id}`} className={`${btn.outline} mt-4 !min-h-11 !py-2.5`}>
                Book this
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section className="bg-mist" aria-labelledby="how">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <h2 id="how" className="text-4xl sm:text-5xl">
            Booked in three taps
          </h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="relative pl-16">
                <span className="absolute left-0 top-0 grid size-12 place-items-center rounded-full bg-ink font-display text-xl font-extrabold text-white">{s.n}</span>
                <h3 className="text-xl">{s.t}</h3>
                <p className="mt-1.5 text-slate">{s.d}</p>
              </li>
            ))}
          </ol>
          <Link href="/book" className={`${btn.dark} mt-10`}>
            Start booking
          </Link>
        </div>
      </section>

      {/* About */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:gap-16 md:py-24" aria-labelledby="about">
        <div className="relative aspect-[4/3] overflow-hidden rounded-panel bg-ink">
          <Photo name="about" alt="The Urban Clippers barber pole" sizes="(min-width: 768px) 45vw, 100vw" />
        </div>
        <div>
          <h2 id="about" className="text-4xl sm:text-5xl">
            Your time matters as much as your hairline
          </h2>
          <p className="mt-4 text-lg text-slate">
            We built {SITE.name} around being on time. The calendar shows the chairs that are really free, your barber knows you&apos;re coming, and a cut or a full groom takes the hour you booked, not the hour you waited.
          </p>
          <ul className="mt-6 space-y-3 text-[17px]">
            {["Clean tools, fresh towels, every customer", "Barbers who listen first and cut second", "Fades, classic cuts, beards, shaves, facials and hair care"].map((t) => (
              <li key={t} className="flex gap-3">
                <svg className="mt-1 size-5 shrink-0 text-pole-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Gallery preview */}
      <section className="bg-ink pb-16 pt-16 text-white md:pb-20" aria-labelledby="gal">
        <div className="on-dark mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 id="gal" className="text-4xl sm:text-5xl">
              From the chair
            </h2>
            <Link href="/gallery" className="font-semibold text-pole underline underline-offset-4">
              See the gallery
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {GALLERY.map((g) => (
              <li key={g.name} className="relative aspect-square overflow-hidden rounded-panel bg-ink-2">
                <Photo name={g.name} alt={g.alt} sizes="(min-width: 768px) 25vw, 50vw" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-20" aria-labelledby="faq">
        <h2 id="faq" className="mb-8 text-4xl sm:text-5xl">
          Good to know
        </h2>
        <Faq />
      </section>

      {/* Find us */}
      <section className="bg-mist" aria-labelledby="find">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-20">
          <div>
            <h2 id="find" className="text-4xl sm:text-5xl">
              Find us
            </h2>
            <address className="mt-4 text-lg not-italic">
              {SITE.addressLines.map((l) => (
                <div key={l}>{l}</div>
              ))}
            </address>
            <ul className="mt-4 space-y-1 text-slate">
              {lines.map((l) => (
                <li key={l.days}>
                  <span className="font-semibold text-ink">{l.days}</span>: {l.hours}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={btn.dark}>
                Get directions
              </a>
              <a href={SITE.phoneHref} className={btn.outline}>
                Call {SITE.phone}
              </a>
            </div>
          </div>
          <MapGraphic className="w-full rounded-panel border-2 border-line" />
        </div>
      </section>

      {/* Final call to action */}
      <section className="on-dark bg-ink text-white">
        <div className="pole-band h-2" aria-hidden="true" />
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
          <h2 className="max-w-xl text-4xl sm:text-5xl">Your chair is waiting.</h2>
          <Link href="/book" className={btn.primary}>
            Book your slot
          </Link>
        </div>
      </section>
    </>
  );
}
