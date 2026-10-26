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
  /** The bank account (card, checking, ...) it came from; null when typed in. */
  accountId: string | null;
};

/** A bank account that expenses were imported from. */
export type Account = {
  id: string;
  /** The bank's name, e.g. "Chase". */
  bank: string | null;
  name: string;
  /** Last 4 digits of the account or card number. */
  mask: string | null;
  /** Plaid's type and subtype, e.g. "credit" / "credit card". */
  type: string;
  subtype: string | null;
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
  /** Bank names, plus NO_ACCOUNT_KEY for expenses typed in by hand. */
  banks: string[];
  /** Account ids, plus NO_ACCOUNT_KEY for expenses typed in by hand. */
  accounts: string[];
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
  accounts: Account[];
  settings: Settings;
  widgets: Widget[];
};
