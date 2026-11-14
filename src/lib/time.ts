/**
 * Date helpers pinned to Asia/Dhaka (UTC+6, no DST).
 * Calendar dates are passed around as "YYYY-MM-DD" strings so we never have timezone drift.
 */
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, "0");

export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
/** Weekly grid order used by the app (Sat → Fri). */
export const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5] as const;
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function toDhaka(now: Date = new Date()): Date {
  return new Date(now.getTime() + DHAKA_OFFSET_MS);
}

export function todayStr(now: Date = new Date()): string {
  const d = toDhaka(now);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function minutesNow(now: Date = new Date()): number {
  const d = toDhaka(now);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

export function isDateStr(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return new Date(d.getTime() + n * DAY_MS).toISOString().slice(0, 10);
}

export function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

/** "Sat, 14 Nov" */
export function fmtDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return `${WEEKDAYS_SHORT[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

export function dayParts(dateStr: string): { day: number; mon: string } {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return { day: d.getUTCDate(), mon: MONTHS_SHORT[d.getUTCMonth()].toUpperCase() };
}

/** "10/24/2026, 10:02:10 AM" in Asia/Dhaka */
export function fmtDateTime(d: Date | string): string {
  return new Date(d).toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
}

export function isValidHHmm(v: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v.trim());
}

export function hhmmToMinutes(v: string): number {
  const [h, m] = v.split(":").map(Number);
  return h * 60 + m;
}

/** Has the ordering cutoff for this slot/date already passed? Past dates are always closed. */
export function cutoffPassed(mealDate: string, cutoffHHmm: string, now: Date = new Date()): boolean {
  const today = todayStr(now);
  if (mealDate < today) return true;
  if (mealDate > today) return false;
  return minutesNow(now) >= hhmmToMinutes(cutoffHHmm);
}
