import {
  AlignLeft,
  Calendar,
  ChartLine,
  ChartPie,
  Grid3x3,
  type LucideIcon,
} from "lucide-react";

import { ALL_WIDGET_IDS } from "@/lib/guava/widgets";
import type { Widget, WidgetId, WidgetSize } from "@/lib/guava/types";

import { CategoryShareWidget } from "./category-share";
import { CategorySpendWidget } from "./category-spend";
import { MonthCalendarWidget } from "./month-calendar";
import { MonthlySpendWidget } from "./monthly-spend-chart";
import { YearHeatmapWidget } from "./year-heatmap";

export type WidgetDef = {
  name: string;
  description: string;
  icon: LucideIcon;
  /** Allowed sizes; a single entry means the widget is locked to it. */
  sizes: readonly WidgetSize[];
  defaultSize: WidgetSize;
  Component: React.ComponentType<{ size: WidgetSize }>;
};

const BOTH = ["half", "full"] as const;

/** Every dashboard widget, keyed by the id persisted in the layout. */
export const WIDGETS: Record<WidgetId, WidgetDef> = {
  cat: {
    name: "Spending by category",
    description: "Top categories against their monthly budgets.",
    icon: AlignLeft,
    sizes: BOTH,
    defaultSize: "half",
    Component: CategorySpendWidget,
  },
  year: {
    name: "Year heatmap",
    description:
      "Every day of the past year, shaded darker the more you spent.",
    icon: Grid3x3,
    sizes: ["full"],
    defaultSize: "full",
    Component: YearHeatmapWidget,
  },
  line: {
    name: "Monthly spend",
    description: "Month-over-month totals. Drag to scroll through history.",
    icon: ChartLine,
    sizes: BOTH,
    defaultSize: "full",
    Component: MonthlySpendWidget,
  },
  cal: {
    name: "Monthly calendar",
    description: "The selected month, each day shaded by spend.",
    icon: Calendar,
    sizes: BOTH,
    defaultSize: "half",
    Component: MonthCalendarWidget,
  },
  share: {
    name: "Category share",
    description: "Donut showing where the month’s money went.",
    icon: ChartPie,
    sizes: BOTH,
    defaultSize: "half",
    Component: CategoryShareWidget,
  },
};

/** Gallery order. */
export const WIDGET_IDS = ALL_WIDGET_IDS;

/** A size the widget allows: `size` if valid, else its default. */
export function fitSize(id: WidgetId, size: WidgetSize | undefined) {
  const def = WIDGETS[id];
  return size && def.sizes.includes(size) ? size : def.defaultSize;
}

/** Drops unknown ids and coerces sizes the widget doesn't support. */
export function normalizeWidgets(list: Widget[]): Widget[] {
  return list
    .filter((w) => w.id in WIDGETS)
    .map((w) => ({ id: w.id, size: fitSize(w.id, w.size) }));
}
