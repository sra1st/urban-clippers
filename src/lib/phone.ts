// Small and dependency-free so browser code can use it too.

/** Accepts 01XXXXXXXXX, +8801XXXXXXXXX, 8801XXXXXXXXX with spaces or dashes. Returns 01XXXXXXXXX or null. */
export function normalizePhone(input: string): string | null {
  let s = input.replace(/[\s\-().]/g, "");
  if (s.startsWith("+88")) s = s.slice(3);
  else if (s.startsWith("88") && s.length === 13) s = s.slice(2);
  return /^01[3-9]\d{8}$/.test(s) ? s : null;
}

/** "01712345678" -> "01712 345 678" */
export function prettyPhone(p: string): string {
  return /^01\d{9}$/.test(p) ? `${p.slice(0, 5)} ${p.slice(5, 8)} ${p.slice(8)}` : p;
}
