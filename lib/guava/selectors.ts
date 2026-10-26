import {
  addDays,
  fromMonthIndex,
  isInMonth,
  monthIndex,
  monthOf,
} from "./dates";
import { filterAmountToCents } from "./money-input";
import type {
  Cat,
  DateKey,
  DayTotal,
  Filters,
  Month,
  Sort,
  Sub,
  Txn,
} from "./types";
import { UNCATEGORIZED_KEY } from "./uncategorized";

// Pure derivations over the store. Hooks in store.tsx memoize these.

export function dailyTotals(txns: Txn[]): Map<DateKey, DayTotal> {
  const map = new Map<DateKey, DayTotal>();
  for (const t of txns) {
    const d = map.get(t.date);
    if (d) {
      d.sum += t.amountCents;
      d.n++;
    } else {
      map.set(t.date, { sum: t.amountCents, n: 1 });
    }
  }
  return map;
}

export function txnsInMonth(txns: Txn[], m: Month): Txn[] {
  return txns.filter((t) => isInMonth(t.date, m));
}

export function sumCents(txns: Txn[]): number {
  return txns.reduce((a, t) => a + t.amountCents, 0);
}

export function reviewCount(txns: Txn[]): number {
  return txns.reduce((a, t) => a + (t.needsReview ? 1 : 0), 0);
}

export type SubStat = { sub: Sub; spent: number; count: number };
export type CategoryStat = {
  cat: Cat;
  spent: number;
  count: number;
  /** Share of the month's total spend, 0–1. */
  share: number;
  subs: SubStat[];
};

export type UncategorizedStat = { spent: number; count: number; share: number };

/**
 * `part` as a 0–1 share of `total`. Refunds are negative expenses, so a
 * category can net below zero or a month's total can be small; clamp so bars
 * and percentages stay in range.
 */
export function shareOf(part: number, total: number): number {
  return total > 0 ? Math.min(1, Math.max(0, part / total)) : 0;
}

/** Per-category spend for one month, sorted by spend (highest first). */
export function categoryStats(
  txns: Txn[],
  cats: Cat[],
  m: Month,
): CategoryStat[] {
  const month = txnsInMonth(txns, m);
  const total = sumCents(month);
  const spent = new Map<string, { spent: number; count: number }>();
  for (const t of month) {
    for (const key of [t.catId, t.subId ? `${t.catId}/${t.subId}` : null]) {
      if (!key) continue;
      const s = spent.get(key) ?? { spent: 0, count: 0 };
      s.spent += t.amountCents;
      s.count++;
      spent.set(key, s);
    }
  }
  return cats
    .map((cat) => {
      const c = spent.get(cat.id) ?? { spent: 0, count: 0 };
      return {
        cat,
        ...c,
        share: shareOf(c.spent, total),
        subs: cat.subs.map((sub) => ({
          sub,
          ...(spent.get(`${cat.id}/${sub.id}`) ?? { spent: 0, count: 0 }),
        })),
      };
    })
    .sort((a, b) => b.spent - a.spent);
}

/** Spend without a category for one month (not part of `categoryStats`). */
export function uncategorizedStat(txns: Txn[], m: Month): UncategorizedStat {
  const month = txnsInMonth(txns, m);
  const total = sumCents(month);
  const none = month.filter((t) => t.catId == null);
  const spent = sumCents(none);
  return { spent, count: none.length, share: shareOf(spent, total) };
}

export type MonthTotal = {
  month: Month;
  total: number;
  /** the current, unfinished month */ partial: boolean;
};

/** The earliest month with an expense, or `today`'s month when there are none. */
export function firstMonth(txns: Txn[], today: DateKey): Month {
  let first = today;
  for (const t of txns) if (t.date < first) first = t.date;
  return monthOf(first);
}

/**
 * One entry per month from `from` through `today`'s month, always covering at
 * least the last 12 months so the chart has a full window.
 */
export function monthlyTotals(
  txns: Txn[],
  from: Month,
  today: DateKey,
): MonthTotal[] {
  const byMonth = new Map<number, number>();
  for (const t of txns) {
    if (t.date > today) continue;
    const k = monthIndex(monthOf(t.date));
    byMonth.set(k, (byMonth.get(k) ?? 0) + t.amountCents);
  }
  const current = monthIndex(monthOf(today));
  const out: MonthTotal[] = [];
  for (let k = Math.min(monthIndex(from), current - 11); k <= current; k++) {
    out.push({
      month: fromMonthIndex(k),
      total: byMonth.get(k) ?? 0,
      partial: k === current,
    });
  }
  return out;
}

// ---- Expenses filtering

export const DEFAULT_FILTERS: Filters = {
  date: "30d",
  q: "",
  min: "",
  max: "",
  cats: [],
  subs: [],
  status: "all",
};
export const CLEARED_FILTERS: Filters = {
  date: "all",
  q: "",
  min: "",
  max: "",
  cats: [],
  subs: [],
  status: "all",
};
export const DEFAULT_SORT: Sort = { key: "date", dir: -1 };

export const DATE_FILTER_OPTIONS: [Filters["date"], string][] = [
  ["7d", "Last 7 days"],
  ["30d", "Last 30 days"],
  ["month", "This month"],
  ["90d", "Last 90 days"],
  ["all", "All time"],
];

export const STATUS_FILTER_OPTIONS: [Filters["status"], string][] = [
  ["all", "All"],
  ["review", "Needs review"],
  ["reviewed", "Reviewed"],
];

export function matchesDate(
  t: Txn,
  f: Filters["date"],
  today: DateKey,
): boolean {
  if (f === "all") return true;
  if (f === "month") return isInMonth(t.date, monthOf(today));
  const days = { "7d": 7, "30d": 30, "90d": 90 }[f];
  return t.date >= addDays(today, -days + 1);
}

/** Applies every filter except status (sections split on that), then sorts. */
export function filterTxns(
  txns: Txn[],
  f: Filters,
  sort: Sort,
  today: DateKey,
): Txn[] {
  const q = f.q.trim().toLowerCase();
  const min = filterAmountToCents(f.min);
  const max = filterAmountToCents(f.max);
  const list = txns.filter(
    (t) =>
      matchesDate(t, f.date, today) &&
      (!q || t.name.toLowerCase().includes(q)) &&
      (isNaN(min) || t.amountCents >= min) &&
      (isNaN(max) || t.amountCents <= max) &&
      (!f.cats.length || f.cats.includes(t.catId ?? UNCATEGORIZED_KEY)) &&
      (!f.subs.length || f.subs.includes(`${t.catId}/${t.subId}`)),
  );
  return list.sort((a, b) => {
    const v =
      sort.key === "date"
        ? a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
        : sort.key === "amount"
          ? a.amountCents - b.amountCents
          : a.name.localeCompare(b.name);
    return v * sort.dir;
  });
}
