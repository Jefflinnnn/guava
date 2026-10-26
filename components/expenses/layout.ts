import type { SortKey } from "@/lib/guava/types";

/**
 * Column templates shared by the header row and every expense row:
 * select · Date · Name · [Bank · Card · Last 4] · Amount · Category ·
 * Subcategory · Needs review? · action. The bracketed columns show only once
 * a bank has been connected.
 */
export const EXPENSE_GRID = {
  plain:
    "grid grid-cols-[40px_104px_minmax(130px,1fr)_100px_140px_132px_124px_44px] items-center",
  accounts:
    "grid grid-cols-[40px_104px_minmax(130px,1fr)_112px_150px_72px_100px_140px_132px_124px_44px] items-center",
};

/** Below this width the table scrolls horizontally inside its card. */
export const TABLE_MIN_WIDTH = {
  plain: "min-w-[814px]",
  accounts: "min-w-[1148px]",
};

/** Reviewed rows are paged this many at a time ("Show more"). */
export const REVIEWED_PAGE_SIZE = 40;

/** Direction a column sorts in when first clicked: names A→Z, the rest newest/largest first. */
export const DEFAULT_SORT_DIR: Record<SortKey, 1 | -1> = {
  date: -1,
  name: 1,
  amount: -1,
};

/** Max lengths (Text caps). */
export const SEARCH_MAX = 40;
export const NAME_MAX = 40;
export const NOTE_MAX = 200;
