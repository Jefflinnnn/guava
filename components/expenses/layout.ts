import type { SortKey } from "@/lib/guava/types";

/**
 * Column template shared by the header row and every expense row:
 * select · Date · Name · Amount · Category · Subcategory · Needs review? · action
 */
export const EXPENSE_GRID =
  "grid grid-cols-[40px_104px_minmax(130px,1fr)_100px_140px_132px_124px_44px] items-center";

/** Below this width the table scrolls horizontally inside its card. */
export const TABLE_MIN_WIDTH = "min-w-[814px]";

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
