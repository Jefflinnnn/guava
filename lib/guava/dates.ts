import type { DateKey, Month } from "./types";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Two-letter weekday labels for calendar headers: Su Mo Tu … */
export const WEEKDAYS_SHORT = WEEKDAYS.map((d) => d.slice(0, 2));

/**
 * The sample data is pinned to a fixed "today" so renders are deterministic
 * (and identical on server and client). Swap for the real date with live data.
 */
export const TODAY: DateKey = "2026-10-04";
export const MIN_MONTH: Month = { year: 2024, month: 0 };
export const MAX_MONTH: Month = { year: 2026, month: 9 };
export const DEFAULT_MONTH: Month = { year: 2026, month: 8 };

export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Parses a DateKey to a local Date at noon (safe from DST edges). */
export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export function keyOf(year: number, month: number, day: number): DateKey {
  return toKey(new Date(year, month, day, 12));
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function monthOf(key: DateKey): Month {
  const [y, m] = key.split("-").map(Number);
  return { year: y, month: m - 1 };
}

/** Months since year 0; handy for comparisons and arithmetic. */
export function monthIndex(m: Month): number {
  return m.year * 12 + m.month;
}

export function fromMonthIndex(i: number): Month {
  return { year: Math.floor(i / 12), month: i % 12 };
}

export function addMonths(m: Month, n: number): Month {
  return fromMonthIndex(monthIndex(m) + n);
}

export function compareMonths(a: Month, b: Month): number {
  return monthIndex(a) - monthIndex(b);
}

export function sameMonth(a: Month, b: Month): boolean {
  return a.year === b.year && a.month === b.month;
}

export function clampMonth(m: Month, min = MIN_MONTH, max = MAX_MONTH): Month {
  if (compareMonths(m, min) < 0) return min;
  if (compareMonths(m, max) > 0) return max;
  return m;
}

export function isInMonth(key: DateKey, m: Month): boolean {
  return key.startsWith(`${m.year}-${String(m.month + 1).padStart(2, "0")}-`);
}

export function daysInMonth(m: Month): number {
  return new Date(m.year, m.month + 1, 0).getDate();
}

/** Weekday (0 = Sunday) of the 1st of the month. */
export function firstWeekday(m: Month): number {
  return new Date(m.year, m.month, 1).getDay();
}

/** "September 2026" */
export function monthLabel(m: Month): string {
  return `${MONTHS_LONG[m.month]} ${m.year}`;
}

/** "Sep 2026" */
export function monthShortLabel(m: Month): string {
  return `${MONTHS[m.month]} ${m.year}`;
}

/** "Oct 4, 2026" */
export function formatDate(key: DateKey): string {
  const d = fromKey(key);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "Sun, Oct 4, 2026" */
export function formatLongDate(key: DateKey): string {
  const d = fromKey(key);
  return `${WEEKDAYS[d.getDay()]}, ${formatDate(key)}`;
}

/** "Sep 14" */
export function formatDayShort(key: DateKey): string {
  const d = fromKey(key);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
