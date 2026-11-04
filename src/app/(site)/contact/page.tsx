import type { Metadata } from "next";
import Link from "next/link";
import { Faq } from "@/components/Faq";
import { btn } from "@/components/ui";
import { getHoursSafe } from "@/lib/data";
import { hoursLines } from "@/lib/hours-format";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const lines = hoursLines(await getHoursSafe());
  const cards = [
    { t: "Call", d: SITE.phone, href: SITE.phoneHref, cta: "Call now", note: "Fastest for same-day changes." },
    { t: "WhatsApp", d: SITE.phone, href: SITE.whatsappHref, cta: "Message us", note: "Questions about services or timing.", external: true },
    { t: "Email", d: SITE.email, href: `mailto:${SITE.email}`, cta: "Send an email", note: "We reply within a day." },
  ];
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-4xl sm:text-6xl">Contact</h1>
      <p className="mb-10 mt-3 max-w-2xl text-lg text-slate">The quickest way to a chair is online booking. For anything else, we&apos;re a call or message away.</p>

      <ul className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <li key={c.t} className="flex flex-col rounded-panel border-2 border-line bg-white p-6">
            <h2 className="text-2xl">{c.t}</h2>
            <p className="mt-1 break-words font-semibold">{c.d}</p>
            <p className="mt-1 flex-1 text-[15px] text-slate">{c.note}</p>
            <a href={c.href} {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={`${btn.dark} mt-5`}>
              {c.cta}
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-12 grid gap-10 md:grid-cols-2">
        <section aria-labelledby="visit">
          <h2 id="visit" className="text-2xl">
            Visit
          </h2>
          <address className="mt-2 text-lg not-italic">
            {SITE.addressLines.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </address>
          <ul className="mt-3 text-slate">
            {lines.map((l) => (
              <li key={l.days}>
                <span className="font-semibold text-ink">{l.days}</span>: {l.hours}
              </li>
            ))}
          </ul>
          <Link href="/location" className="mt-3 inline-block font-semibold text-pole-dark underline underline-offset-4">
            Map and directions
          </Link>
        </section>
        <section aria-labelledby="book-h" className="rounded-panel bg-ink p-6 text-white sm:p-8">
          <h2 id="book-h" className="text-3xl">
            Skip the phone call
          </h2>
          <p className="mb-5 mt-2 text-white/80">See the real free times and book your chair in under a minute.</p>
          <Link href="/book" className={btn.primary}>
            Book your slot
          </Link>
        </section>
      </div>

      <section className="mt-16 max-w-3xl" aria-labelledby="faq-c">
        <h2 id="faq-c" className="mb-6 text-3xl">
          Quick answers
        </h2>
        <Faq />
      </section>
    </div>
  );
}
