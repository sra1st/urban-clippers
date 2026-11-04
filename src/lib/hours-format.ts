import type { HoursRow } from "./availability";
import { WEEKDAY_NAMES } from "./seed-data";
import { formatTime12, hhmm, nowDhaka, toMinutes } from "./time";

const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];
const short = (d: number) => WEEKDAY_NAMES[d].slice(0, 3);

/** Groups consecutive days with the same hours: [{ days: "Every day", hours: "10:00 AM to 11:00 PM" }]. */
export function hoursLines(hours: HoursRow[]): { days: string; hours: string }[] {
  const byDay = new Map(hours.map((h) => [h.weekday, h]));
  const label = (d: number) => {
    const h = byDay.get(d);
    return !h || h.closed ? "Closed" : `${formatTime12(h.open)} to ${formatTime12(h.close)}`;
  };
  const groups: { from: number; to: number; text: string }[] = [];
  MON_FIRST.forEach((d, i) => {
    const text = label(d);
    const last = groups[groups.length - 1];
    if (last && last.text === text) last.to = i;
    else groups.push({ from: i, to: i, text });
  });
  if (groups.length === 1) return [{ days: "Every day", hours: groups[0].text }];
  return groups.map((g) => ({
    days: g.from === g.to ? WEEKDAY_NAMES[MON_FIRST[g.from]] : `${short(MON_FIRST[g.from])} to ${short(MON_FIRST[g.to])}`,
    hours: g.text,
  }));
}

export type OpenStatus = { open: boolean; text: string };

export function getOpenStatus(hours: HoursRow[], at: Date = new Date()): OpenStatus {
  const now = nowDhaka(at);
  const weekday = new Date(`${now.date}T00:00:00Z`).getUTCDay();
  const today = hours.find((h) => h.weekday === weekday);
  if (today && !today.closed && now.minutes >= toMinutes(today.open) && now.minutes < toMinutes(today.close)) {
    return { open: true, text: `Open now until ${formatTime12(today.close)}` };
  }
  if (today && !today.closed && now.minutes < toMinutes(today.open)) {
    return { open: false, text: `Closed now. Opens today at ${formatTime12(today.open)}` };
  }
  for (let i = 1; i <= 7; i++) {
    const h = hours.find((x) => x.weekday === (weekday + i) % 7);
    if (h && !h.closed) {
      const when = i === 1 ? "tomorrow" : WEEKDAY_NAMES[h.weekday];
      return { open: false, text: `Closed now. Opens ${when} at ${formatTime12(hhmm(h.open))}` };
    }
  }
  return { open: false, text: "Closed" };
}
