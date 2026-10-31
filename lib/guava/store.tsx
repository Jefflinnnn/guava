"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { clampMonth, monthOf, toKey } from "./dates";
import { restoredTxn } from "./trash";
import { heatThresholds, type HeatThresholds } from "./heat";
import { canMarkReviewed } from "./spending";
import {
  categoryStats,
  dailyTotals,
  firstMonth,
  monthlyTotals,
  reviewCount,
  uncategorizedStat,
  type CategoryStat,
  type UncategorizedStat,
} from "./selectors";
import * as server from "./server/actions";
import type {
  Account,
  Cat,
  DeletedTxn,
  DateKey,
  DayTotal,
  Month,
  Settings,
  Snapshot,
  Sub,
  Txn,
  Widget,
} from "./types";

// The client-side copy of the user's data. Every change is applied here
// first, so the UI updates instantly, and then persisted with a server
// action. If saving fails, the store reloads everything from the database.

type State = Snapshot & {
  /** The month the Dashboard and Categories pages show. */
  month: Month;
  /** Set when a save failed; the data is then reloaded from the database. */
  syncError: boolean;
};

/** A transaction to save. `id: null` creates a new one. */
type TxnDraft = Omit<Txn, "id"> & { id: string | null };
/** A category to save. `id: null` creates a new one (subs are kept on edit). */
type CatDraft = Omit<Cat, "id" | "subs"> & { id: string | null };
/** A subcategory to save. `id: null` creates a new one. */
type SubDraft = Omit<Sub, "id"> & { id: string | null };

type Action =
  | { type: "setMonth"; month: Month }
  | { type: "upsertTxn"; txn: Txn; isNew: boolean }
  | { type: "deleteTxns"; ids: string[]; deletedAt: string }
  | { type: "restoreTxns"; ids: string[] }
  | { type: "purgeTxns"; ids: string[] }
  | { type: "setReview"; ids: string[]; needsReview: boolean }
  | {
      type: "categorize";
      ids: string[];
      catId: string | null;
      subId: string | null;
    }
  | { type: "upsertCat"; cat: Omit<Cat, "subs">; isNew: boolean }
  | { type: "deleteCat"; id: string; moveTo: string | null }
  | { type: "upsertSub"; catId: string; sub: Sub; isNew: boolean }
  | { type: "deleteSub"; catId: string; subId: string }
  | { type: "setSetting"; key: keyof Settings; value: boolean }
  | { type: "setWidgets"; widgets: Widget[] }
  | { type: "saveFailed" }
  | { type: "reload"; snapshot: Snapshot }
  | { type: "dismissSyncError" };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "setMonth":
      return { ...s, month: a.month };
    case "upsertTxn":
      return a.isNew
        ? { ...s, txns: [a.txn, ...s.txns] }
        : {
            ...s,
            txns: s.txns.map((t) => (t.id === a.txn.id ? a.txn : t)),
          };
    // Deleting moves expenses to Recently deleted; see lib/guava/trash.ts.
    case "deleteTxns": {
      const ids = new Set(a.ids);
      const moved = s.txns
        .filter((t) => ids.has(t.id))
        .map((t) => ({ ...t, deletedAt: a.deletedAt }));
      return {
        ...s,
        txns: s.txns.filter((t) => !ids.has(t.id)),
        deleted: [...moved, ...s.deleted],
      };
    }
    case "restoreTxns": {
      const ids = new Set(a.ids);
      const back = s.deleted.filter((t) => ids.has(t.id)).map(restoredTxn);
      return {
        ...s,
        // Kept newest first, like the list the server sends.
        txns: [...back, ...s.txns].sort(
          (x, y) => y.date.localeCompare(x.date) || y.id.localeCompare(x.id),
        ),
        deleted: s.deleted.filter((t) => !ids.has(t.id)),
      };
    }
    case "purgeTxns": {
      const ids = new Set(a.ids);
      return { ...s, deleted: s.deleted.filter((t) => !ids.has(t.id)) };
    }
    case "setReview": {
      const ids = new Set(a.ids);
      return {
        ...s,
        // Uncategorized spending stays in review until it gets a category.
        txns: s.txns.map((t) =>
          ids.has(t.id) && canMarkReviewed(t)
            ? { ...t, needsReview: a.needsReview }
            : t,
        ),
      };
    }
    case "categorize": {
      const ids = new Set(a.ids);
      return {
        ...s,
        // Uncategorized spending goes back to review.
        txns: s.txns.map((t) =>
          ids.has(t.id)
            ? {
                ...t,
                catId: a.catId,
                subId: a.subId,
                needsReview:
                  t.needsReview || !canMarkReviewed({ ...t, catId: a.catId }),
              }
            : t,
        ),
      };
    }
    case "upsertCat":
      return a.isNew
        ? { ...s, cats: [...s.cats, { ...a.cat, subs: [] }] }
        : {
            ...s,
            cats: s.cats.map((c) =>
              c.id === a.cat.id ? { ...c, ...a.cat } : c,
            ),
          };
    case "deleteCat": {
      // Recently deleted expenses move too, as they do in the database.
      const move = <T extends Txn>(t: T): T =>
        t.catId !== a.id
          ? t
          : a.moveTo
            ? { ...t, catId: a.moveTo, subId: null }
            : { ...t, catId: null, subId: null, needsReview: true };
      return {
        ...s,
        cats: s.cats.filter((c) => c.id !== a.id),
        txns: s.txns.map(move),
        deleted: s.deleted.map(move),
      };
    }
    case "upsertSub":
      return {
        ...s,
        cats: s.cats.map((c) => {
          if (c.id !== a.catId) return c;
          return {
            ...c,
            subs: a.isNew
              ? [...c.subs, a.sub]
              : c.subs.map((x) => (x.id === a.sub.id ? a.sub : x)),
          };
        }),
      };
    case "deleteSub":
      return {
        ...s,
        cats: s.cats.map((c) =>
          c.id === a.catId
            ? { ...c, subs: c.subs.filter((x) => x.id !== a.subId) }
            : c,
        ),
        txns: s.txns.map((t) => dropSub(t, a.catId, a.subId)),
        deleted: s.deleted.map((t) => dropSub(t, a.catId, a.subId)),
      };
    case "setSetting":
      return { ...s, settings: { ...s.settings, [a.key]: a.value } };
    case "setWidgets":
      return { ...s, widgets: a.widgets };
    case "saveFailed":
      return { ...s, syncError: true };
    case "reload":
      return { ...s, ...a.snapshot };
    case "dismissSyncError":
      return { ...s, syncError: false };
  }
}

function dropSub<T extends Txn>(t: T, catId: string, subId: string): T {
  return t.catId === catId && t.subId === subId ? { ...t, subId: null } : t;
}

const WIDGET_SAVE_DELAY_MS = 600;

function makeActions(dispatch: React.Dispatch<Action>) {
  /** Persists a change; on failure, reloads the store from the database. */
  const persist = (save: () => Promise<void>) => {
    save().catch(async (error: unknown) => {
      console.error("Failed to save change", error);
      dispatch({ type: "saveFailed" });
      try {
        dispatch({ type: "reload", snapshot: await server.getSnapshot() });
      } catch (reloadError) {
        console.error("Failed to reload data", reloadError);
      }
    });
  };
  let widgetTimer: ReturnType<typeof setTimeout> | undefined;

  return {
    setMonth: (month: Month) => dispatch({ type: "setMonth", month }),
    /** Re-reads everything from the database, e.g. after a bank sync. */
    reload: async () => {
      dispatch({ type: "reload", snapshot: await server.getSnapshot() });
    },
    upsertTxn: ({ id, ...draft }: TxnDraft) => {
      const isNew = id == null;
      const input =
        draft.catId == null
          ? {
              ...draft,
              subId: null,
              needsReview: !canMarkReviewed(draft) || draft.needsReview,
            }
          : draft;
      const txn = { id: id ?? crypto.randomUUID(), ...input };
      dispatch({ type: "upsertTxn", txn, isNew });
      persist(() =>
        isNew
          ? server.createExpense(txn.id, input)
          : server.updateExpense(txn.id, input),
      );
    },
    /** Moves expenses to Recently deleted. */
    deleteTxns: (ids: string[]) => {
      if (!ids.length) return;
      dispatch({
        type: "deleteTxns",
        ids,
        deletedAt: new Date().toISOString(),
      });
      persist(() => server.deleteExpenses(ids));
    },
    /** Brings expenses back from Recently deleted. */
    restoreTxns: (ids: string[]) => {
      if (!ids.length) return;
      dispatch({ type: "restoreTxns", ids });
      persist(() => server.restoreExpenses(ids));
    },
    /** Deletes expenses in Recently deleted for good. */
    purgeTxns: (ids: string[]) => {
      if (!ids.length) return;
      dispatch({ type: "purgeTxns", ids });
      persist(() => server.purgeDeletedExpenses(ids));
    },
    /** `needsReview: false` marks reviewed; `true` moves back to the review queue. */
    setReview: (ids: string[], needsReview: boolean) => {
      if (!ids.length) return;
      dispatch({ type: "setReview", ids, needsReview });
      persist(() => server.setExpensesReview(ids, needsReview));
    },
    /** Puts expenses in a category, or a subcategory of it. */
    categorize: (ids: string[], catId: string | null, subId: string | null) => {
      if (!ids.length) return;
      dispatch({ type: "categorize", ids, catId, subId });
      persist(() => server.categorizeExpenses(ids, catId, subId));
    },
    /** Returns the category's id (new ones get one here). */
    upsertCat: ({ id, ...input }: CatDraft): string => {
      const isNew = id == null;
      const cat = { id: id ?? crypto.randomUUID(), ...input };
      dispatch({ type: "upsertCat", cat, isNew });
      persist(() =>
        isNew
          ? server.createCategory(cat.id, input)
          : server.updateCategory(cat.id, input),
      );
      return cat.id;
    },
    /**
     * Deletes a category. Its transactions move to `moveTo` and lose their
     * subcategory; without `moveTo` they become uncategorized.
     */
    deleteCat: (id: string, moveTo: string | null) => {
      dispatch({ type: "deleteCat", id, moveTo });
      persist(() => server.deleteCategory(id, moveTo));
    },
    upsertSub: (catId: string, { id, ...input }: SubDraft) => {
      const isNew = id == null;
      const sub = { id: id ?? crypto.randomUUID(), ...input };
      dispatch({ type: "upsertSub", catId, sub, isNew });
      persist(() =>
        isNew
          ? server.createSubcategory(catId, sub.id, input)
          : server.updateSubcategory(catId, sub.id, input),
      );
    },
    /** Deletes a subcategory; its transactions keep the category but lose the subcategory. */
    deleteSub: (catId: string, subId: string) => {
      dispatch({ type: "deleteSub", catId, subId });
      persist(() => server.deleteSubcategory(catId, subId));
    },
    setSetting: (key: keyof Settings, value: boolean) => {
      dispatch({ type: "setSetting", key, value });
      persist(() => server.setSetting(key, value));
    },
    /** Saved after a short pause, so dragging to reorder sends one request. */
    setWidgets: (widgets: Widget[]) => {
      dispatch({ type: "setWidgets", widgets });
      clearTimeout(widgetTimer);
      widgetTimer = setTimeout(
        () => persist(() => server.saveWidgets(widgets)),
        WIDGET_SAVE_DELAY_MS,
      );
    },
    dismissSyncError: () => dispatch({ type: "dismissSyncError" }),
  };
}

type GuavaActions = ReturnType<typeof makeActions>;

type Derived = {
  daily: Map<DateKey, DayTotal>;
  thresholds: HeatThresholds;
  reviewCount: number;
  catById: Map<string, Cat>;
  accountById: Map<string, Account>;
  /** The earliest and latest months the month pickers allow. */
  bounds: { min: Month; max: Month };
  /** Expenses that count toward totals (not card payments, transfers…). */
  spending: Txn[];
};

const GuavaContext = createContext<{
  state: State;
  actions: GuavaActions;
  derived: Derived;
  today: DateKey;
} | null>(null);

const noSubscribe = () => () => {};
const localToday = () => toKey(new Date());

/**
 * `initial` is loaded on the server for the current user. `serverToday` is
 * the server's date, used until hydration; after that "today" is the date
 * in the browser's own time zone.
 */
export function GuavaProvider({
  initial,
  serverToday,
  children,
}: {
  initial: Snapshot;
  serverToday: DateKey;
  children: ReactNode;
}) {
  const today = useSyncExternalStore(
    noSubscribe,
    localToday,
    () => serverToday,
  );
  const [state, dispatch] = useReducer(reducer, undefined, (): State => ({
    ...initial,
    month: monthOf(serverToday),
    syncError: false,
  }));
  const actions = useMemo(() => makeActions(dispatch), []);
  // Totals and charts count only spending (see lib/guava/spending.ts).
  const spending = useMemo(
    () => state.txns.filter((t) => t.spending),
    [state.txns],
  );
  const daily = useMemo(() => dailyTotals(spending), [spending]);
  const derived = useMemo<Derived>(
    () => ({
      daily,
      thresholds: heatThresholds(daily),
      reviewCount: reviewCount(state.txns),
      catById: new Map(state.cats.map((c) => [c.id, c])),
      accountById: new Map(state.accounts.map((a) => [a.id, a])),
      bounds: { min: firstMonth(state.txns, today), max: monthOf(today) },
      spending,
    }),
    [daily, spending, state.txns, state.cats, state.accounts, today],
  );
  const value = useMemo(
    () => ({ state, actions, derived, today }),
    [state, actions, derived, today],
  );
  return (
    <GuavaContext.Provider value={value}>{children}</GuavaContext.Provider>
  );
}

/** Full store access: `{ state, actions, derived }`. */
function useGuava() {
  const ctx = useContext(GuavaContext);
  if (!ctx) throw new Error("useGuava must be used inside <GuavaProvider>");
  return ctx;
}

export function useActions(): GuavaActions {
  return useGuava().actions;
}

export function useTxns(): Txn[] {
  return useGuava().state.txns;
}

export function useCategories(): Cat[] {
  return useGuava().state.cats;
}

export function useCatById(): Map<string, Cat> {
  return useGuava().derived.catById;
}

/** Recently deleted, newest first. */
export function useDeletedTxns(): DeletedTxn[] {
  return useGuava().state.deleted;
}

export function useAccounts(): Account[] {
  return useGuava().state.accounts;
}

export function useAccountById(): Map<string, Account> {
  return useGuava().derived.accountById;
}

/** The current calendar date (YYYY-MM-DD) in the browser's time zone. */
export function useToday(): DateKey {
  return useGuava().today;
}

/** Whether a save failed, and a way to dismiss the notice. */
export function useSyncError(): [boolean, () => void] {
  const { state, actions } = useGuava();
  return [state.syncError, actions.dismissSyncError];
}

/** The earliest and latest months the month pickers allow. */
export function useMonthBounds(): { min: Month; max: Month } {
  return useGuava().derived.bounds;
}

/** The dashboard month, kept within `useMonthBounds()`. */
export function useSelectedMonth(): [Month, (m: Month) => void] {
  const { state, actions, derived } = useGuava();
  const { min, max } = derived.bounds;
  const month = clampMonth(state.month, min, max);
  const setMonth = useCallback(
    (m: Month) => actions.setMonth(clampMonth(m, min, max)),
    [actions, min, max],
  );
  return [month, setMonth];
}

export function useSettings(): Settings {
  return useGuava().state.settings;
}

export function useReviewCount(): number {
  return useGuava().derived.reviewCount;
}

/** Daily spend totals (cents) keyed by DateKey, plus the heat-scale thresholds. */
export function useDailyTotals(): {
  daily: Map<DateKey, DayTotal>;
  thresholds: HeatThresholds;
} {
  const { daily, thresholds } = useGuava().derived;
  return { daily, thresholds };
}

/** Per-category stats for `month` (defaults to the selected month), highest spend first. */
export function useCategoryStats(month?: Month): CategoryStat[] {
  const { state, derived } = useGuava();
  const m = month ?? state.month;
  return useMemo(
    () => categoryStats(derived.spending, state.cats, m),
    [derived.spending, state.cats, m],
  );
}

/** Spend without a category for `month` (defaults to the selected month). */
export function useUncategorizedStat(month?: Month): UncategorizedStat {
  const { state, derived } = useGuava();
  const m = month ?? state.month;
  return useMemo(
    () => uncategorizedStat(derived.spending, m),
    [derived.spending, m],
  );
}

export function useMonthlyTotals() {
  const { derived, today } = useGuava();
  const { spending } = derived;
  const { min } = derived.bounds;
  return useMemo(
    () => monthlyTotals(spending, min, today),
    [spending, min, today],
  );
}

/** The dashboard widget layout, saved to the user's settings. */
export function useWidgets(): [
  Widget[],
  (next: Widget[] | ((prev: Widget[]) => Widget[])) => void,
] {
  const { state, actions } = useGuava();
  const { widgets } = state;
  const setWidgets = useCallback(
    (next: Widget[] | ((prev: Widget[]) => Widget[])) =>
      actions.setWidgets(typeof next === "function" ? next(widgets) : next),
    [actions, widgets],
  );
  return [widgets, setWidgets];
}
