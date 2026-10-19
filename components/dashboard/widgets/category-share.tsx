"use client";

import { CategorySwatch } from "@/components/guava/category-swatch";
import { monthLabel } from "@/lib/guava/dates";
import { money0Fit, percent } from "@/lib/guava/format";
import {
  useCategoryStats,
  useSelectedMonth,
  useUncategorizedStat,
} from "@/lib/guava/store";
import { UNCATEGORIZED } from "@/lib/guava/uncategorized";

import { WidgetHeader } from "./widget-header";

type Slice = {
  key: string;
  name: string;
  color: string;
  spent: number;
  share: number;
};

/** `conic-gradient` stops, one slice per category with spend. */
function donutBackground(slices: Slice[], total: number): string {
  if (!total) return "var(--muted)";
  let acc = 0;
  const stops = slices
    .filter((s) => s.spent > 0)
    .map((s) => {
      const from = acc;
      acc += (s.spent / total) * 100;
      return `${s.color} ${from}% ${acc}%`;
    });
  return `conic-gradient(${stops.join(", ")})`;
}

/** Donut of where the selected month's money went, with a % legend. */
export function CategoryShareWidget() {
  const [month] = useSelectedMonth();
  const stats = useCategoryStats();
  const none = useUncategorizedStat();
  // Uncategorized spend is its own grey slice, listed last.
  const slices: Slice[] = stats.map((s) => ({
    key: s.cat.id,
    name: s.cat.name,
    color: s.cat.color,
    spent: s.spent,
    share: s.share,
  }));
  if (none.spent > 0) slices.push({ key: "none", ...UNCATEGORIZED, ...none });
  const total = slices.reduce((a, s) => a + s.spent, 0);

  return (
    <>
      <WidgetHeader title="Category share" subtitle={monthLabel(month)} />
      <div className="mt-5 flex flex-wrap items-center gap-6">
        <div
          className="flex size-[168px] flex-none items-center justify-center rounded-full"
          style={{ background: donutBackground(slices, total) }}
        >
          <div className="flex size-[108px] flex-col items-center justify-center rounded-full bg-card">
            <span className="text-lg font-semibold tracking-[-0.02em] tabular">
              {money0Fit(total, 7)}
            </span>
            <span className="text-[11px] text-ink-3">total</span>
          </div>
        </div>
        <ul className="flex min-w-[140px] flex-1 flex-col gap-2">
          {slices.map((s) => (
            <li key={s.key} className="flex items-center gap-2 text-[13px]">
              <CategorySwatch color={s.color} size={10} />
              <span className="min-w-0 flex-1 truncate text-ink-2">
                {s.name}
              </span>
              <span className="font-mono text-xs">{percent(s.share)}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
