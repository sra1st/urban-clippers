import Link from "next/link";
import type { ServiceRow } from "@/lib/bookings";
import { groupByCategory } from "@/lib/data";
import { ADDON_CATEGORIES } from "@/lib/duration";
import { formatBDT } from "@/lib/time";

/** The price list, laid out like a barbershop board: name, dotted leader, price. */
export function PriceBoard({ services, withBookLinks = false }: { services: ServiceRow[]; withBookLinks?: boolean }) {
  const groups = groupByCategory(services);
  return (
    <div className="grid gap-x-16 gap-y-10 md:grid-cols-2">
      {groups.map((g) => (
        <section key={g.category} aria-labelledby={`cat-${g.category}`}>
          <h3 id={`cat-${g.category}`} className="mb-3 border-b-2 border-ink pb-2 text-xl">
            {g.category}
          </h3>
          <ul className="divide-y divide-line/70">
            {g.items.map((s) => (
              <li key={s.id} className="py-3">
                <div className="price-row">
                  <span className="font-semibold">
                    {s.name}
                    {ADDON_CATEGORIES.has(g.category) && <span className="ml-2 rounded-chip bg-mist px-2 py-0.5 align-middle text-xs font-bold text-slate">+1 hr</span>}
                  </span>
                  <span className="leader" aria-hidden="true" />
                  <span className="font-display text-lg font-bold tabular-nums">{formatBDT(s.price)}</span>
                </div>
                <p className="mt-0.5 max-w-[46ch] text-sm text-slate">{s.description}</p>
                {withBookLinks && (
                  <Link href={`/book?service=${s.id}`} className="mt-1.5 inline-block text-sm font-semibold text-pole-dark underline-offset-4 hover:underline">
                    Book {s.name.toLowerCase()}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
