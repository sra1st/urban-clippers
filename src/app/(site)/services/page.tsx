import type { Metadata } from "next";
import Link from "next/link";
import { PriceBoard } from "@/components/PriceBoard";
import { btn } from "@/components/ui";
import { getServicesSafe } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Services and prices",
  description: "Haircuts, fades, beard trims, hot towel shaves, facials, hair care and packages. All prices in taka.",
};

export default async function ServicesPage() {
  const services = await getServicesSafe();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-4xl sm:text-6xl">Services and prices</h1>
      <p className="mb-10 mt-3 max-w-2xl text-lg text-slate">
        A booking is generally one hour with one barber. Each facial or hair treatment you add takes another hour, and your barber is held for all of it. Prices are in taka and paid at the studio.
      </p>
      <PriceBoard services={services} withBookLinks />
      <div className="mt-14 flex flex-wrap items-center gap-4 rounded-panel bg-ink p-6 text-white sm:p-8">
        <p className="min-w-0 flex-1 font-display text-2xl font-bold">Ready when you are.</p>
        <Link href="/book" className={btn.primary}>
          Book your slot
        </Link>
      </div>
    </div>
  );
}
