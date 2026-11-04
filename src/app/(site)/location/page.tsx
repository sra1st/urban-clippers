import type { Metadata } from "next";
import Link from "next/link";
import { MapGraphic } from "@/components/MapGraphic";
import { OpenNow } from "@/components/OpenNow";
import { btn } from "@/components/ui";
import { getHoursSafe } from "@/lib/data";
import { hoursLines } from "@/lib/hours-format";
import { mapsUrl, SITE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Location and hours" };

export default async function LocationPage() {
  const hours = await getHoursSafe();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-4xl sm:text-6xl">Location and hours</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <MapGraphic className="w-full rounded-panel border-2 border-line" />
        <div className="space-y-8">
          <section aria-labelledby="addr">
            <h2 id="addr" className="text-2xl">
              Address
            </h2>
            <address className="mt-2 text-lg not-italic">
              <strong>{SITE.name}</strong>
              {SITE.addressLines.map((l) => (
                <div key={l}>{l}</div>
              ))}
            </address>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={btn.dark}>
                Get directions
              </a>
              <a href={SITE.phoneHref} className={btn.outline}>
                Call us
              </a>
            </div>
          </section>

          <section aria-labelledby="hrs">
            <h2 id="hrs" className="text-2xl">
              Opening hours
            </h2>
            <div className="mt-2">
              <OpenNow hours={hours} tone="light" />
            </div>
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {hoursLines(hours).map((l) => (
                <li key={l.days} className="flex justify-between gap-4 py-3">
                  <span className="font-semibold">{l.days}</span>
                  <span className="tabular-nums">{l.hours}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-slate">The last booking of the day starts at 10:00 PM.</p>
          </section>

          <section aria-labelledby="get">
            <h2 id="get" className="text-2xl">
              Getting here
            </h2>
            <ul className="mt-2 space-y-2 text-slate">
              <li>Rickshaw or CNG: ask for {SITE.addressLines[0].replace("Level 2, ", "")}, {SITE.addressLines[1]}.</li>
              <li>The studio is on the second floor. Take the stairs next to the pharmacy entrance.</li>
              <li>Street parking is available on the road. Bikes can park at the building entrance.</li>
            </ul>
          </section>
        </div>
      </div>
      <div className="mt-12">
        <Link href="/book" className={btn.primary}>
          Book your slot
        </Link>
      </div>
    </div>
  );
}
