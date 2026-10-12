// All money helpers take integer cents.

/** "$1,234.56" */
export function money(cents: number): string {
  const n = cents / 100;
  return (
    (n < 0 ? "-$" : "$") +
    Math.abs(n).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/** "$1,235" (rounded to whole dollars) */
export function money0(cents: number): string {
  return (
    (cents < 0 ? "-$" : "$") +
    Math.round(Math.abs(cents) / 100).toLocaleString("en-US")
  );
}

const UNITS: [string, number][] = [
  ["K", 1e3],
  ["M", 1e6],
  ["B", 1e9],
  ["T", 1e12],
];

/**
 * Compact money with K/M/B/T. Drops decimals (2 → 1 → 0) until the result
 * fits in `maxChars`, so the unit letter is never lost. "$1.2K", "$125K".
 */
export function compact(cents: number, maxChars = 7): string {
  const a = Math.abs(cents) / 100;
  if (a < 1000) return "$" + Math.round(a);
  let i = a >= 1e12 ? 3 : a >= 1e9 ? 2 : a >= 1e6 ? 1 : 0;
  let x = a / UNITS[i][1];
  if (Math.round(x) >= 1000 && i < 3) {
    i++;
    x = a / UNITS[i][1];
  }
  for (const d of [2, 1, 0]) {
    const s = "$" + x.toFixed(d) + UNITS[i][0];
    if (s.length <= maxChars || d === 0) return s;
  }
  return "$" + Math.round(x) + UNITS[i][0];
}

/** Full `money` string, switching to `compact` only when it would overflow. */
export function moneyFit(cents: number, maxChars: number): string {
  const s = money(cents);
  return s.length > maxChars ? compact(cents, maxChars) : s;
}

/** Whole-dollar `money0` string, switching to `compact` only when it would overflow. */
export function money0Fit(cents: number, maxChars: number): string {
  const s = money0(cents);
  return s.length > maxChars ? compact(cents, maxChars) : s;
}

/** Calendar cell amount (5 chars max): "$48", "$1.2K". */
export function calendarAmount(cents: number): string {
  return money0Fit(cents, 5);
}

/** Display string for a money input: "1,234.56" ("" for null). */
export function formatCentsInput(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function plural(n: number, one: string, many = one + "s"): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function initialOf(name: string): string {
  return (name.trim()[0] || "?").toUpperCase();
}
