// How long a visit lasts. Safe to import from both server and browser code.
//
// Rule (matches the FAQ): haircut, beard, shave and massage work together take one hour.
// Every facial or hair-care treatment adds one more hour on top, and the barber is held for all of it.
export const ADDON_CATEGORIES: ReadonlySet<string> = new Set(["Facial and skin", "Hair care"]);

export function visitHours(services: { category: string }[]): number {
  const addons = services.filter((s) => ADDON_CATEGORIES.has(s.category)).length;
  const hasBase = services.some((s) => !ADDON_CATEGORIES.has(s.category));
  return Math.max(1, (hasBase ? 1 : 0) + addons);
}

export const hoursLabel = (h: number) => (h === 1 ? "1 hour" : `${h} hours`);
