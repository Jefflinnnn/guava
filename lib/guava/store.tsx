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
import { heatThresholds, type HeatThresholds } from "./heat";
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
  Cat,
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
export type TxnDraft = Omit<Txn, "id"> & { id: string | null };
/** A category to save. `id: null` creates a new one (subs are kept on edit). */
export type CatDraft = Omit<Cat, "id" | "subs"> & { id: string | null };
/** A subcategory to save. `id: null` creates a new one. */
export type SubDraft = Omit<Sub, "id"> & { id: string | null };

type Action =
  | { type: "setMonth"; month: Month }
  | { type: "upsertTxn"; txn: Txn; isNew: boolean }
  | { type: "deleteTxn"; id: string }
  | { type: "setReview"; ids: string[]; needsReview: boolean }
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
    case "deleteTxn":
      return { ...s, txns: s.txns.filter((t) => t.id !== a.id) };
    case "setReview": {
      const ids = new Set(a.ids);
      return {
        ...s,
        // Uncategorized expenses stay in review until they get a category.
        txns: s.txns.map((t) =>
          ids.has(t.id) && t.catId != null
            ? { ...t, needsReview: a.needsReview }
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
    case "deleteCat":
      return {
        ...s,
        cats: s.cats.filter((c) => c.id !== a.id),
        txns: s.txns.map((t) =>
          t.catId !== a.id
            ? t
            : a.moveTo
              ? { ...t, catId: a.moveTo, subId: null }
              : { ...t, catId: null, subId: null, needsReview: true },
        ),
      };
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
        txns: s.txns.map((t) =>
          t.catId === a.catId && t.subId === a.subId
            ? { ...t, subId: null }
            : t,
        ),
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
          ? { ...draft, subId: null, needsReview: true }
          : draft;
      const txn = { id: id ?? crypto.randomUUID(), ...input };
      dispatch({ type: "upsertTxn", txn, isNew });
      persist(() =>
        isNew
          ? server.createExpense(txn.id, input)
          : server.updateExpense(txn.id, input),
      );
    },
    deleteTxn: (id: string) => {
      dispatch({ type: "deleteTxn", id });
      persist(() => server.deleteExpense(id));
    },
    /** `needsReview: false` marks reviewed; `true` moves back to the review queue. */
    setReview: (ids: string[], needsReview: boolean) => {
      if (!ids.length) return;
      dispatch({ type: "setReview", ids, needsReview });
      persist(() => server.setExpensesReview(ids, needsReview));
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

export type GuavaActions = ReturnType<typeof makeActions>;

type Derived = {
  daily: Map<DateKey, DayTotal>;
  thresholds: HeatThresholds;
  reviewCount: number;
  catById: Map<string, Cat>;
  /** The earliest and latest months the month pickers allow. */
  bounds: { min: Month; max: Month };
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
  const daily = useMemo(() => dailyTotals(state.txns), [state.txns]);
  const derived = useMemo<Derived>(
    () => ({
      daily,
      thresholds: heatThresholds(daily),
      reviewCount: reviewCount(state.txns),
      catById: new Map(state.cats.map((c) => [c.id, c])),
      bounds: { min: firstMonth(state.txns, today), max: monthOf(today) },
    }),
    [daily, state.txns, state.cats, today],
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
export function useGuava() {
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
  const { state } = useGuava();
  const m = month ?? state.month;
  return useMemo(
    () => categoryStats(state.txns, state.cats, m),
    [state.txns, state.cats, m],
  );
}

/** Spend without a category for `month` (defaults to the selected month). */
export function useUncategorizedStat(month?: Month): UncategorizedStat {
  const { state } = useGuava();
  const m = month ?? state.month;
  return useMemo(() => uncategorizedStat(state.txns, m), [state.txns, m]);
}

export function useMonthlyTotals() {
  const { state, derived, today } = useGuava();
  const { txns } = state;
  const { min } = derived.bounds;
  return useMemo(() => monthlyTotals(txns, min, today), [txns, min, today]);
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
