import type { Metadata } from "next";
import { ServicesEditor } from "@/components/admin/ServicesEditor";
import { listServices } from "@/lib/bookings";
import { CATEGORIES } from "@/lib/seed-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Services" };

export default async function AdminServices() {
  const services = await listServices({ includeInactive: true });
  const categories = [...new Set([...CATEGORIES, ...services.map((s) => s.category)])];
  return (
    <div>
      <h1 className="text-3xl sm:text-4xl">Services</h1>
      <p className="mb-6 mt-2 max-w-2xl text-slate">
        Change a price or description and the website updates straight away. Hide a service instead of deleting it, so old bookings keep their original prices.
      </p>
      <ServicesEditor services={services.map((s) => ({ id: s.id, category: s.category, name: s.name, description: s.description, price: s.price, isActive: s.isActive }))} categories={categories} />
    </div>
  );
}
