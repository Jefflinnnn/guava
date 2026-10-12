import { formatDayShort, fromKey, WEEKDAYS } from "@/lib/guava/dates";
import { money, plural } from "@/lib/guava/format";
import type { DateKey, DayTotal } from "@/lib/guava/types";

/** "$123.45 · 3 transactions on Wed, Sep 14" (year heatmap, calendar widget). */
export function dayDetail(key: DateKey, day: DayTotal | undefined): string {
  const when = `${WEEKDAYS[fromKey(key).getDay()]}, ${formatDayShort(key)}`;
  return day?.sum
    ? `${money(day.sum)} · ${plural(day.n, "transaction")} on ${when}`
    : `No spending on ${when}`;
}

/** "Sep 14 · $123.45 · 3 txns" (Spend Calendar popover). */
export function dayDetailShort(
  key: DateKey,
  day: DayTotal | undefined,
): string {
  return `${formatDayShort(key)} · ${
    day?.sum ? `${money(day.sum)} · ${plural(day.n, "txn")}` : "No spending"
  }`;
}
