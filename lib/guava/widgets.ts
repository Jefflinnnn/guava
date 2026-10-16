import type { Widget, WidgetId } from "./types";

/** Every dashboard widget, in gallery order. */
export const ALL_WIDGET_IDS: WidgetId[] = [
  "cat",
  "year",
  "line",
  "cal",
  "share",
];

export function isWidgetList(v: unknown): v is Widget[] {
  return (
    Array.isArray(v) &&
    v.length <= ALL_WIDGET_IDS.length &&
    v.every(
      (w) =>
        w &&
        typeof w === "object" &&
        ALL_WIDGET_IDS.includes((w as Widget).id) &&
        ((w as Widget).size === "half" || (w as Widget).size === "full"),
    )
  );
}
