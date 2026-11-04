import type { Metadata } from "next";
import { BookingFlow } from "@/components/BookingFlow";
import { getUser } from "@/lib/auth";
import { getServicesSafe, groupByCategory } from "@/lib/data";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Book your slot" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function BookPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const services = await getServicesSafe();
  const user = await getUser().catch(() => null);

  const valid = new Set(services.map((s) => s.id));
  const serviceIds = (one(sp.service) ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && valid.has(n))
    .slice(0, 4);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(one(sp.date) ?? "") ? one(sp.date)! : null;
  const time = /^\d{2}:\d{2}$/.test(one(sp.time) ?? "") ? one(sp.time)! : null;

  const groups = groupByCategory(services).map((g) => ({
    category: g.category,
    items: g.items.map((s) => ({ id: s.id, name: s.name, description: s.description, price: s.price })),
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-6 text-4xl sm:text-5xl">Book your slot</h1>
      <BookingFlow
        groups={groups}
        user={user ? { name: user.isDemo ? "" : user.name, phone: user.isDemo ? "" : user.phone } : null}
        preset={{ serviceIds, date, time: date ? time : null }}
        demoNotice={SITE.demoNotice}
      />
    </div>
  );
}
