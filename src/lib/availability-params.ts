// Reads ?hours=, ?barber= and ?exclude= from an availability request. Bad values fall back to the safe default.
export function readOpts(params: URLSearchParams): { hours: number; barberId: number | null; excludeCode: string | null } {
  const h = Number(params.get("hours"));
  const b = Number(params.get("barber"));
  const ex = (params.get("exclude") ?? "").trim().toUpperCase();
  return {
    hours: Number.isInteger(h) && h >= 1 && h <= 8 ? h : 1,
    barberId: Number.isInteger(b) && b > 0 ? b : null,
    excludeCode: /^UC-[A-Z0-9]{6}$/.test(ex) ? ex : null,
  };
}
