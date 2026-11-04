// Read helpers for public pages. If the database is unreachable the pages still render with default content.
import { cache } from "react";
import { getHours, type HoursRow } from "./availability";
import { listServices, type ServiceRow } from "./bookings";
import { CATEGORIES, HOURS, SERVICES } from "./seed-data";

export const getServicesSafe = cache(async (): Promise<ServiceRow[]> => {
  try {
    return await listServices();
  } catch (err) {
    console.error("[data] services fallback", err);
    return SERVICES.map((s) => ({ id: s.id, category: s.category, name: s.name, description: s.description, price: s.price, isActive: true, sort: s.sort }));
  }
});

export const getHoursSafe = cache(async (): Promise<HoursRow[]> => {
  try {
    return await getHours();
  } catch (err) {
    console.error("[data] hours fallback", err);
    return HOURS.map((h) => ({ weekday: h.weekday, closed: h.closed, open: h.open, close: h.close }));
  }
});

export function groupByCategory(services: ServiceRow[]): { category: string; items: ServiceRow[] }[] {
  const order = [...CATEGORIES];
  for (const s of services) if (!order.includes(s.category)) order.push(s.category);
  return order
    .map((category) => ({ category, items: services.filter((s) => s.category === category) }))
    .filter((g) => g.items.length > 0);
}
