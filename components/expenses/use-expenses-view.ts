"use client";

import { useMemo, useState } from "react";

import {
  CLEARED_FILTERS,
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  filterTxns,
  matchesDate,
} from "@/lib/guava/selectors";
import { useActions, useToday, useTxns } from "@/lib/guava/store";
import type { Filters, Sort, SortKey } from "@/lib/guava/types";

import { DEFAULT_SORT_DIR, REVIEWED_PAGE_SIZE } from "./layout";

/**
 * Local UI state of the Expenses table: filters, sort, row selection and
 * reviewed-section paging, plus the lists derived from them.
 */
export function useExpensesView() {
  const txns = useTxns();
  const { setReview } = useActions();
  const today = useToday();

  const [filters, setFiltersState] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
  const [selection, setSelection] = useState<string[]>([]);
  const [reviewedLimit, setReviewedLimit] = useState(REVIEWED_PAGE_SIZE);

  const { review, reviewed, catCounts } = useMemo(() => {
    const list = filterTxns(txns, filters, sort, today);
    const catCounts = new Map<string, number>();
    for (const t of txns)
      if (matchesDate(t, filters.date, today))
        catCounts.set(t.catId, (catCounts.get(t.catId) ?? 0) + 1);
    return {
      review: list.filter((t) => t.needsReview),
      reviewed: list.filter((t) => !t.needsReview),
      catCounts,
    };
  }, [txns, filters, sort, today]);

  const showReview = filters.status !== "reviewed";
  const showReviewed = filters.status !== "review";
  const reviewedShown = reviewed.slice(0, reviewedLimit);

  // Ignore ids that no longer exist (e.g. a selected expense was deleted).
  const selected = useMemo(() => {
    const ids = new Set(txns.map((t) => t.id));
    return selection.filter((id) => ids.has(id));
  }, [txns, selection]);
  const selectedSet = new Set(selected);

  const visibleIds = [
    ...(showReview ? review : []),
    ...(showReviewed ? reviewedShown : []),
  ].map((t) => t.id);
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));

  return {
    filters,
    sort,
    review,
    reviewed,
    reviewedShown,
    showReview,
    showReviewed,
    catCounts,
    selected,
    selectedSet,
    allSelected,
    hasVisibleRows: visibleIds.length > 0,

    setFilters(patch: Partial<Filters>) {
      setFiltersState((f) => ({ ...f, ...patch }));
      setReviewedLimit(REVIEWED_PAGE_SIZE);
    },
    resetFilters() {
      setFiltersState(CLEARED_FILTERS);
      setReviewedLimit(REVIEWED_PAGE_SIZE);
    },
    sortBy(key: SortKey) {
      setSort((s) => ({
        key,
        dir: s.key === key ? (-s.dir as 1 | -1) : DEFAULT_SORT_DIR[key],
      }));
    },
    showMoreReviewed() {
      setReviewedLimit((n) => n + REVIEWED_PAGE_SIZE);
    },
    toggleSelected(id: string, on: boolean) {
      setSelection((s) =>
        on ? [...s.filter((x) => x !== id), id] : s.filter((x) => x !== id),
      );
    },
    toggleAll() {
      setSelection(allSelected ? [] : visibleIds);
    },
    clearSelection() {
      setSelection([]);
    },
    /** Moves rows between the sections; always clears the selection. */
    setNeedsReview(ids: string[], needsReview: boolean) {
      setReview(ids, needsReview);
      setSelection([]);
    },
  };
}

export type ExpensesView = ReturnType<typeof useExpensesView>;
