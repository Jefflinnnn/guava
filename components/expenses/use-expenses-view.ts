"use client";

import { useMemo, useRef, useState } from "react";

import {
  bankKey,
  CLEARED_FILTERS,
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  filterTxns,
  matchesDate,
} from "@/lib/guava/selectors";
import { NO_ACCOUNT_KEY } from "@/lib/guava/accounts";
import {
  useAccountById,
  useAccounts,
  useActions,
  useDeletedTxns,
  useToday,
  useTxns,
} from "@/lib/guava/store";
import type { Filters, Sort, SortKey } from "@/lib/guava/types";
import { UNCATEGORIZED_KEY } from "@/lib/guava/uncategorized";

import { DEFAULT_SORT_DIR, REVIEWED_PAGE_SIZE } from "./layout";

/**
 * Local UI state of the Expenses table: filters, sort, row selection and
 * reviewed-section paging, plus the lists derived from them.
 */
export function useExpensesView() {
  const txns = useTxns();
  const deletedTxns = useDeletedTxns();
  const { setReview, deleteTxns, restoreTxns, purgeTxns } = useActions();
  const today = useToday();
  const accounts = useAccounts();
  const accountById = useAccountById();
  const usedAccounts = useMemo(() => {
    const used = new Set(txns.map((t) => t.accountId));
    return accounts.filter((a) => used.has(a.id));
  }, [txns, accounts]);

  const [filters, setFiltersState] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
  const [selection, setSelection] = useState<string[]>([]);
  // The last checkbox clicked, where a shift-click range starts.
  const anchor = useRef<string | null>(null);
  const [reviewedLimit, setReviewedLimit] = useState(REVIEWED_PAGE_SIZE);
  // The last batch moved to Recently deleted, for the toolbar's Undo.
  const [lastDeleted, setLastDeleted] = useState<string[]>([]);

  const { review, reviewed, catCounts, bankCounts, accountCounts } =
    useMemo(() => {
      const list = filterTxns(txns, filters, sort, today, accountById);
      // Like an inbox, expenses that need review show whatever their date, so a
      // bank import of older transactions can't hide behind the date filter.
      const undated = filterTxns(
        txns,
        { ...filters, date: "all" },
        sort,
        today,
        accountById,
      );
      // Counts shown next to each filter option, within the date range.
      const catCounts = new Map<string, number>();
      const bankCounts = new Map<string, number>();
      const accountCounts = new Map<string, number>();
      const bump = (m: Map<string, number>, key: string) =>
        m.set(key, (m.get(key) ?? 0) + 1);
      for (const t of txns) {
        if (!matchesDate(t, filters.date, today)) continue;
        const account = t.accountId ? accountById.get(t.accountId) : undefined;
        bump(catCounts, t.catId ?? UNCATEGORIZED_KEY);
        bump(bankCounts, bankKey(account));
        bump(accountCounts, account?.id ?? NO_ACCOUNT_KEY);
      }
      return {
        review: undated.filter((t) => t.needsReview),
        reviewed: list.filter((t) => !t.needsReview),
        catCounts,
        bankCounts,
        accountCounts,
      };
    }, [txns, filters, sort, today, accountById]);

  // "Recently deleted" replaces both sections; the date filter doesn't apply.
  const showDeleted = filters.status === "deleted";
  const showReview = filters.status === "all" || filters.status === "review";
  const showReviewed =
    filters.status === "all" || filters.status === "reviewed";
  const reviewedShown = reviewed.slice(0, reviewedLimit);
  const deleted = useMemo(
    () =>
      showDeleted
        ? filterTxns(
            deletedTxns,
            { ...filters, date: "all" },
            sort,
            today,
            accountById,
          )
        : [],
    [showDeleted, deletedTxns, filters, sort, today, accountById],
  );

  // Ignore ids that no longer exist (e.g. a selected expense was deleted).
  const selected = useMemo(() => {
    const ids = new Set((showDeleted ? deletedTxns : txns).map((t) => t.id));
    return selection.filter((id) => ids.has(id));
  }, [showDeleted, deletedTxns, txns, selection]);
  const selectedSet = new Set(selected);
  // Undo only while those expenses are still in Recently deleted.
  const undoable = useMemo(() => {
    const ids = new Set(deletedTxns.map((t) => t.id));
    return lastDeleted.filter((id) => ids.has(id));
  }, [deletedTxns, lastDeleted]);

  const visibleIds = [
    ...(showReview ? review : []),
    ...(showReviewed ? reviewedShown : []),
    ...deleted,
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
    deleted,
    showDeleted,
    /** Everything in Recently deleted, whatever the filters. */
    deletedCount: deletedTxns.length,
    /** How many expenses the toolbar's Undo would bring back. */
    undoCount: undoable.length,
    catCounts,
    bankCounts,
    accountCounts,
    /** The Bank, Card and Last 4 columns show once a bank was connected. */
    showAccounts: accounts.length > 0,
    /** Accounts with at least one expense (a mortgage or 401k may have none). */
    usedAccounts,
    selected,
    selectedSet,
    allSelected,
    hasVisibleRows: visibleIds.length > 0,

    setFilters(patch: Partial<Filters>) {
      // A selection doesn't carry between Recently deleted and the rest.
      if (patch.status && patch.status !== filters.status) setSelection([]);
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
    /**
     * Selects or deselects one row. With `range` (shift-click), every visible
     * row from the last clicked one through this one follows it, like Gmail.
     */
    toggleSelected(id: string, on: boolean, range = false) {
      const from = anchor.current ? visibleIds.indexOf(anchor.current) : -1;
      const to = visibleIds.indexOf(id);
      anchor.current = id;
      const ids =
        range && from >= 0 && to >= 0
          ? visibleIds.slice(Math.min(from, to), Math.max(from, to) + 1)
          : [id];
      setSelection((s) => {
        const rest = s.filter((x) => !ids.includes(x));
        return on ? [...rest, ...ids] : rest;
      });
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
    /** Moves expenses to Recently deleted (undoable from the toolbar). */
    deleteExpenses(ids: string[]) {
      deleteTxns(ids);
      setLastDeleted(ids);
      setSelection([]);
    },
    undoDelete() {
      restoreTxns(undoable);
      setLastDeleted([]);
    },
    dismissUndo() {
      setLastDeleted([]);
    },
    /** Brings expenses back from Recently deleted. */
    restore(ids: string[]) {
      restoreTxns(ids);
      setSelection([]);
    },
    /** Deletes expenses in Recently deleted for good. */
    deleteForGood(ids: string[]) {
      purgeTxns(ids);
      setSelection([]);
    },
  };
}

export type ExpensesView = ReturnType<typeof useExpensesView>;
