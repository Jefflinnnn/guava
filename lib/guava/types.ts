/** A calendar date as `YYYY-MM-DD` (local, no time zone). */
export type DateKey = string;

/** A calendar month. `month` is 0-based (0 = January). */
export type Month = { year: number; month: number };

export type Txn = {
  id: string;
  date: DateKey;
  name: string;
  amountCents: number;
  /** null = uncategorized (then `subId` is null and `needsReview` is true). */
  catId: string | null;
  subId: string | null;
  needsReview: boolean;
  note: string;
  /** False for card payments, transfers and income: listed, not totaled. */
  spending: boolean;
  /** Plaid's detailed category for bank imports; null when typed in. */
  bankCategory: string | null;
};

export type Sub = { id: string; name: string };

export type Cat = {
  id: string;
  name: string;
  /** Any CSS color (presets are oklch, custom picks are hex). */
  color: string;
  locked: boolean;
  subs: Sub[];
};

export type WidgetId = "cat" | "year" | "line" | "cal" | "share";
export type WidgetSize = "half" | "full";
export type Widget = { id: WidgetId; size: WidgetSize };

export type DateFilter = "7d" | "30d" | "month" | "90d" | "all";
export type StatusFilter = "all" | "review" | "reviewed";

export type Filters = {
  date: DateFilter;
  q: string;
  /** Dollar strings as typed in the filter boxes ("" = unset). */
  min: string;
  max: string;
  /** Category ids, plus UNCATEGORIZED_KEY for expenses without one. */
  cats: string[];
  /** `${catId}/${subId}` keys. */
  subs: string[];
  status: StatusFilter;
};

export type SortKey = "date" | "name" | "amount";
export type Sort = { key: SortKey; dir: 1 | -1 };

export type Settings = {
  autoBills: boolean;
  weekly: boolean;
  big: boolean;
};

export type DayTotal = { sum: number; n: number };

/** Everything the app loads from the user's database on first render. */
export type Snapshot = {
  txns: Txn[];
  cats: Cat[];
  settings: Settings;
  widgets: Widget[];
};
