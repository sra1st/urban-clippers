// Everything is handled as plain "YYYY-MM-DD" and "HH:MM" strings in Asia/Dhaka time.
// Dhaka has no daylight saving, so a fixed +06:00 offset is exact.
import { TZ } from "./config";

const pad = (n: number) => String(n).padStart(2, "0");

const clock = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function nowDhaka(now: Date = new Date()): { date: string; minutes: number } {
  const p: Record<string, string> = {};
  for (const part of clock.formatToParts(now)) p[part.type] = part.value;
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

export function parseDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

export const isValidDate = (s: string) => parseDate(s) !== null;
export const isValidTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

export function addDays(date: string, n: number): string {
  const dt = parseDate(date);
  if (!dt) throw new Error(`Bad date: ${date}`);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

export function weekdayOf(date: string): number {
  const dt = parseDate(date);
  if (!dt) throw new Error(`Bad date: ${date}`);
  return dt.getUTCDay();
}

/** "10:00:00" or "10:00" -> "10:00" */
export const hhmm = (t: string) => t.slice(0, 5);

export function toMinutes(t: string): number {
  const [h, m] = hhmm(t).split(":");
  return Number(h) * 60 + Number(m);
}

export const fromMinutes = (n: number) => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;

/** "19:00" -> "7:00 PM" */
export function formatTime12(t: string): string {
  const [h, m] = hhmm(t).split(":").map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? "PM" : "AM"}`;
}

const dayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const dayLongFmt = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export function formatDay(date: string): string {
  const dt = parseDate(date);
  return dt ? dayFmt.format(dt) : date;
}

export function formatDayLong(date: string): string {
  const dt = parseDate(date);
  return dt ? dayLongFmt.format(dt) : date;
}

/** Epoch milliseconds of a Dhaka wall-clock date and time. */
export function dhakaEpoch(date: string, time: string): number {
  const dt = parseDate(date);
  if (!dt) throw new Error(`Bad date: ${date}`);
  const [h, m] = hhmm(time).split(":").map(Number);
  return Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), h - 6, m);
}

export function minutesUntil(date: string, time: string, nowMs: number = Date.now()): number {
  return Math.floor((dhakaEpoch(date, time) - nowMs) / 60000);
}

export function dayLabel(date: string, today: string): string {
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  return formatDay(date);
}

export function formatBDT(n: number): string {
  return `৳${n.toLocaleString("en-US")}`;
}

/** "12:00" + 2 hours -> "14:00". */
export const addHoursTo = (time: string, hours: number): string => fromMinutes(toMinutes(time) + hours * 60);
