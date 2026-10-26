import { money0 } from "@/lib/guava/format";
import { filterAmountToCents } from "@/lib/guava/money-input";
import {
  CLEARED_FILTERS,
  DATE_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
} from "@/lib/guava/selectors";
import {
  accountLabel,
  NO_ACCOUNT_KEY,
  NO_ACCOUNT_LABEL,
} from "@/lib/guava/accounts";
import type { Account, Cat, Filters } from "@/lib/guava/types";
import { UNCATEGORIZED, UNCATEGORIZED_KEY } from "@/lib/guava/uncategorized";

/** The filterable columns, in header order. */
export type FilterKey =
  "date" | "name" | "bank" | "account" | "amount" | "cat" | "sub" | "status";

export type ActiveFilter = {
  key: FilterKey;
  label: string;
  /** Patch that clears this filter. */
  clear: Partial<Filters>;
};

export function labelOf<T extends string>(
  options: [T, string][],
  value: T,
): string {
  return options.find(([v]) => v === value)?.[1] ?? value;
}

/** Which columns currently narrow the list (tints their filter buttons). */
export function activeFilterKeys(f: Filters): Record<FilterKey, boolean> {
  return {
    date: f.date !== CLEARED_FILTERS.date,
    name: f.q.trim() !== "",
    bank: f.banks.length > 0,
    account: f.accounts.length > 0,
    amount: f.min !== "" || f.max !== "",
    cat: f.cats.length > 0,
    sub: f.subs.length > 0,
    status: f.status !== CLEARED_FILTERS.status,
  };
}

function amountLabel(min: string, max: string): string {
  const lo = filterAmountToCents(min);
  const hi = filterAmountToCents(max);
  if (!isNaN(lo) && !isNaN(hi)) return `${money0(lo)}–${money0(hi)}`;
  return isNaN(lo) ? `≤ ${money0(hi)}` : `≥ ${money0(lo)}`;
}

/** One removable chip per active filter, for the toolbar. */
export function activeFilters(
  f: Filters,
  catById: Map<string, Cat>,
  accountById: Map<string, Account>,
): ActiveFilter[] {
  const on = activeFilterKeys(f);
  const subName = (key: string) => {
    const [catId, subId] = key.split("/");
    return catById.get(catId)?.subs.find((s) => s.id === subId)?.name ?? "?";
  };
  const chips: ActiveFilter[] = [];
  if (on.date)
    chips.push({
      key: "date",
      label: `Date: ${labelOf(DATE_FILTER_OPTIONS, f.date)}`,
      clear: { date: CLEARED_FILTERS.date },
    });
  if (on.name)
    chips.push({
      key: "name",
      label: `Name: “${f.q.trim()}”`,
      clear: { q: "" },
    });
  if (on.bank)
    chips.push({
      key: "bank",
      label: `Bank: ${f.banks.map((b) => (b === NO_ACCOUNT_KEY ? NO_ACCOUNT_LABEL : b)).join(", ")}`,
      clear: { banks: [] },
    });
  if (on.account)
    chips.push({
      key: "account",
      label: `Card: ${f.accounts
        .map((id) => {
          if (id === NO_ACCOUNT_KEY) return NO_ACCOUNT_LABEL;
          const a = accountById.get(id);
          return a ? accountLabel(a) : "?";
        })
        .join(", ")}`,
      clear: { accounts: [] },
    });
  if (on.amount)
    chips.push({
      key: "amount",
      label: `Amount: ${amountLabel(f.min, f.max)}`,
      clear: { min: "", max: "" },
    });
  if (on.cat)
    chips.push({
      key: "cat",
      label: `Category: ${f.cats.map((id) => (id === UNCATEGORIZED_KEY ? UNCATEGORIZED.name : (catById.get(id)?.name ?? "?"))).join(", ")}`,
      clear: { cats: [] },
    });
  if (on.sub)
    chips.push({
      key: "sub",
      label: `Subcategory: ${f.subs.map(subName).join(", ")}`,
      clear: { subs: [] },
    });
  if (on.status)
    chips.push({
      key: "status",
      label: `Status: ${labelOf(STATUS_FILTER_OPTIONS, f.status)}`,
      clear: { status: CLEARED_FILTERS.status },
    });
  return chips;
}
