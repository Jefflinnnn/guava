"use client";

import { CategorySwatch } from "@/components/guava/category-swatch";
import { monthLabel } from "@/lib/guava/dates";
import { money0Fit } from "@/lib/guava/format";
import type { CategoryStat } from "@/lib/guava/selectors";
import { useCategoryStats, useSelectedMonth } from "@/lib/guava/store";

import { WidgetHeader } from "./widget-header";

/** `conic-gradient` stops, one slice per category with spend. */
function donutBackground(stats: CategoryStat[], total: number): string {
  if (!total) return "var(--muted)";
  let acc = 0;
  const stops = stats
    .filter((s) => s.spent > 0)
    .map((s) => {
      const from = acc;
      acc += (s.spent / total) * 100;
      return `${s.cat.color} ${from}% ${acc}%`;
    });
  return `conic-gradient(${stops.join(", ")})`;
}

/** Donut of where the selected month's money went, with a % legend. */
export function CategoryShareWidget() {
  const [month] = useSelectedMonth();
  const stats = useCategoryStats();
  const total = stats.reduce((a, s) => a + s.spent, 0);

  return (
    <>
      <WidgetHeader title="Category share" subtitle={monthLabel(month)} />
      <div className="mt-5 flex flex-wrap items-center gap-6">
        <div
          className="flex size-[168px] flex-none items-center justify-center rounded-full"
          style={{ background: donutBackground(stats, total) }}
        >
          <div className="flex size-[108px] flex-col items-center justify-center rounded-full bg-card">
            <span className="text-lg font-semibold tracking-[-0.02em] tabular">
              {money0Fit(total, 7)}
            </span>
            <span className="text-[11px] text-ink-3">total</span>
          </div>
        </div>
        <ul className="flex min-w-[140px] flex-1 flex-col gap-2">
          {stats.map((s) => (
            <li key={s.cat.id} className="flex items-center gap-2 text-[13px]">
              <CategorySwatch color={s.cat.color} size={10} />
              <span className="min-w-0 flex-1 truncate text-ink-2">
                {s.cat.name}
              </span>
              <span className="font-mono text-xs">
                {(s.share * 100).toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
