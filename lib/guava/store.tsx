"use client";

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

import { useLocalStorage } from "@/lib/use-local-storage";

import { clampMonth, DEFAULT_MONTH } from "./dates";
import { heatThresholds, type HeatThresholds } from "./heat";
import { generateSampleTxns, SAMPLE_CATEGORIES } from "./sample-data";
import {
  categoryStats,
  dailyTotals,
  monthlyTotals,
  reviewCount,
  type CategoryStat,
} from "./selectors";
import type {
  Cat,
  DateKey,
  DayTotal,
  Month,
  Settings,
  Sub,
  Txn,
  Widget,
  WidgetId,
} from "./types";

type State = {
  txns: Txn[];
  cats: Cat[];
  /** The month the Dashboard and Categories pages show. */
  month: Month;
  settings: Settings;
};

/** A transaction to save. `id: null` creates a new one. */
export type TxnDraft = Omit<Txn, "id"> & { id: number | null };
/** A category to save. `id: null` creates a new one (subs are kept on edit). */
export type CatDraft = Omit<Cat, "id" | "subs"> & { id: string | null };
/** A subcategory to save. `id: null` creates a new one. */
export type SubDraft = Omit<Sub, "id"> & { id: string | null };

type Action =
  | { type: "setMonth"; month: Month }
  | { type: "upsertTxn"; txn: TxnDraft }
  | { type: "deleteTxn"; id: number }
  | { type: "setReview"; ids: number[]; needsReview: boolean }
  | { type: "upsertCat"; cat: CatDraft; newId: string }
  | { type: "deleteCat"; id: string; moveTo: string | null }
  | { type: "upsertSub"; catId: string; sub: SubDraft; newId: string }
  | { type: "deleteSub"; catId: string; subId: string }
  | { type: "toggleSetting"; key: keyof Settings };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "setMonth":
      return { ...s, month: clampMonth(a.month) };
    case "upsertTxn": {
      const { id, ...rec } = a.txn;
      if (id != null)
        return {
          ...s,
          txns: s.txns.map((t) => (t.id === id ? { ...t, ...rec } : t)),
        };
      const nextId = s.txns.reduce((m, t) => Math.max(m, t.id), 0) + 1;
      return { ...s, txns: [{ id: nextId, ...rec }, ...s.txns] };
    }
    case "deleteTxn":
      return { ...s, txns: s.txns.filter((t) => t.id !== a.id) };
    case "setReview": {
      const ids = new Set(a.ids);
      return {
        ...s,
        txns: s.txns.map((t) =>
          ids.has(t.id) ? { ...t, needsReview: a.needsReview } : t,
        ),
      };
    }
    case "upsertCat": {
      const { id, ...rec } = a.cat;
      if (id != null)
        return {
          ...s,
          cats: s.cats.map((c) => (c.id === id ? { ...c, ...rec } : c)),
        };
      return { ...s, cats: [...s.cats, { id: a.newId, ...rec, subs: [] }] };
    }
    case "deleteCat":
      return {
        ...s,
        cats: s.cats.filter((c) => c.id !== a.id),
        txns: a.moveTo
          ? s.txns.map((t) =>
              t.catId === a.id ? { ...t, catId: a.moveTo!, subId: null } : t,
            )
          : s.txns,
      };
    case "upsertSub":
      return {
        ...s,
        cats: s.cats.map((c) => {
          if (c.id !== a.catId) return c;
          const { id, ...rec } = a.sub;
          return {
            ...c,
            subs:
              id != null
                ? c.subs.map((x) => (x.id === id ? { ...x, ...rec } : x))
                : [...c.subs, { id: a.newId, ...rec }],
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
    case "toggleSetting":
      return { ...s, settings: { ...s.settings, [a.key]: !s.settings[a.key] } };
  }
}

function init(): State {
  return {
    txns: generateSampleTxns(),
    cats: SAMPLE_CATEGORIES,
    month: DEFAULT_MONTH,
    settings: { autoBills: true, weekly: true, big: false },
  };
}

function makeActions(dispatch: React.Dispatch<Action>) {
  const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}`;
  return {
    setMonth: (month: Month) => dispatch({ type: "setMonth", month }),
    upsertTxn: (txn: TxnDraft) => dispatch({ type: "upsertTxn", txn }),
    deleteTxn: (id: number) => dispatch({ type: "deleteTxn", id }),
    /** `needsReview: false` marks reviewed; `true` moves back to the review queue. */
    setReview: (ids: number[], needsReview: boolean) =>
      dispatch({ type: "setReview", ids, needsReview }),
    upsertCat: (cat: CatDraft) =>
      dispatch({ type: "upsertCat", cat, newId: newId("c") }),
    /** Deletes a category; its transactions move to `moveTo` and lose their subcategory. */
    deleteCat: (id: string, moveTo: string | null) =>
      dispatch({ type: "deleteCat", id, moveTo }),
    upsertSub: (catId: string, sub: SubDraft) =>
      dispatch({ type: "upsertSub", catId, sub, newId: newId("s") }),
    /** Deletes a subcategory; its transactions keep the category but lose the subcategory. */
    deleteSub: (catId: string, subId: string) =>
      dispatch({ type: "deleteSub", catId, subId }),
    toggleSetting: (key: keyof Settings) =>
      dispatch({ type: "toggleSetting", key }),
  };
}

export type GuavaActions = ReturnType<typeof makeActions>;

type Derived = {
  daily: Map<DateKey, DayTotal>;
  thresholds: HeatThresholds;
  reviewCount: number;
  catById: Map<string, Cat>;
};

const GuavaContext = createContext<{
  state: State;
  actions: GuavaActions;
  derived: Derived;
} | null>(null);

export function GuavaProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const actions = useMemo(() => makeActions(dispatch), []);
  const daily = useMemo(() => dailyTotals(state.txns), [state.txns]);
  const derived = useMemo<Derived>(
    () => ({
      daily,
      thresholds: heatThresholds(daily),
      reviewCount: reviewCount(state.txns),
      catById: new Map(state.cats.map((c) => [c.id, c])),
    }),
    [daily, state.txns, state.cats],
  );
  const value = useMemo(
    () => ({ state, actions, derived }),
    [state, actions, derived],
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

export function useSelectedMonth(): [Month, (m: Month) => void] {
  const { state, actions } = useGuava();
  return [state.month, actions.setMonth];
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

export function useMonthlyTotals() {
  const txns = useTxns();
  return useMemo(() => monthlyTotals(txns), [txns]);
}

// ---- Dashboard widget layout (per browser for now; per user once auth lands)

export const ALL_WIDGET_IDS: WidgetId[] = [
  "cat",
  "year",
  "line",
  "cal",
  "share",
];
const NO_WIDGETS: Widget[] = [];
const isWidgetList = (v: unknown): v is Widget[] =>
  Array.isArray(v) &&
  v.every(
    (w) =>
      w &&
      typeof w === "object" &&
      ALL_WIDGET_IDS.includes((w as Widget).id) &&
      ((w as Widget).size === "half" || (w as Widget).size === "full"),
  );

export function useWidgets() {
  return useLocalStorage<Widget[]>(
    "guava.widgets.v2",
    NO_WIDGETS,
    isWidgetList,
  );
}
