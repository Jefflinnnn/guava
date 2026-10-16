"use client";

import { useMemo, useState } from "react";

import { HeatCell, HeatLegend } from "@/components/guava/heat";
import {
  addDays,
  fromKey,
  isInMonth,
  MONTHS,
  monthOf,
} from "@/lib/guava/dates";
import { money0 } from "@/lib/guava/format";
import { heatLevel } from "@/lib/guava/heat";
import { useDailyTotals, useSelectedMonth, useToday } from "@/lib/guava/store";
import type { DateKey } from "@/lib/guava/types";
import { cn } from "@/lib/utils";

import { dayDetail } from "../day-caption";
import { WidgetHeader } from "./widget-header";

const WEEKS = 53;
const ROW_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
/** 28px label gutter, then one column per week. */
const GRID_COLS = "grid-cols-[28px_repeat(53,minmax(0,1fr))]";

/** 53 weeks × 7 days ending with the week of `today`, Sunday-first columns. */
function buildYear(today: DateKey) {
  const lastSunday = addDays(today, -fromKey(today).getDay());
  const start = addDays(lastSunday, -(WEEKS - 1) * 7);
  const weeks: DateKey[][] = [];
  const monthLabels: { label: string; week: number }[] = [
    { label: MONTHS[fromKey(start).getMonth()], week: 0 },
  ];
  for (let w = 0; w < WEEKS; w++) {
    const days = Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d));
    weeks.push(days);
    const first = days.find((k) => k <= today && k.endsWith("-01"));
    if (first && w > 1)
      monthLabels.push({ label: MONTHS[fromKey(first).getMonth()], week: w });
  }
  return { days: weeks.flat(), monthLabels };
}

/** GitHub-style year of daily spend. Clicking a day opens its month. */
export function YearHeatmapWidget() {
  const { daily, thresholds } = useDailyTotals();
  const [month, setMonth] = useSelectedMonth();
  const [hovered, setHovered] = useState<DateKey | null>(null);
  const today = useToday();
  const year = useMemo(() => buildYear(today), [today]);

  const { total, active, past } = useMemo(() => {
    let total = 0;
    let active = 0;
    let past = 0;
    for (const k of year.days) {
      if (k > today) continue;
      past++;
      const sum = daily.get(k)?.sum ?? 0;
      total += sum;
      if (sum) active++;
    }
    return { total, active, past };
  }, [daily, year, today]);

  return (
    <>
      <WidgetHeader
        title={`${money0(total)} spent in the last year`}
        subtitle="Each square is a day — darker means more spent. Click a day to jump to its month."
        aside={
          <div className="min-h-[18px] text-[13px] font-medium tabular">
            {hovered && dayDetail(hovered, daily.get(hovered))}
          </div>
        }
      />
      <div className="mt-[18px] overflow-x-auto">
        <div className="min-w-[640px]">
          <div className={cn("mb-1.5 grid h-3.5 gap-x-[3px]", GRID_COLS)}>
            {year.monthLabels.map(({ label, week }) => (
              <span
                key={week}
                className="row-start-1 text-[11px] leading-[14px] text-ink-3"
                style={{ gridColumn: `${week + 2} / span 4` }}
              >
                {label}
              </span>
            ))}
          </div>
          <div
            className={cn(
              "grid grid-flow-col grid-rows-7 gap-[3px]",
              GRID_COLS,
            )}
            onMouseLeave={() => setHovered(null)}
          >
            {ROW_LABELS.map((l, i) => (
              <span
                key={i}
                className="self-center text-[10px] leading-none text-ink-3"
              >
                {l}
              </span>
            ))}
            {year.days.map((k) =>
              k > today ? (
                <div key={k} />
              ) : (
                <HeatCell
                  key={k}
                  level={heatLevel(daily.get(k)?.sum ?? 0, thresholds)}
                  onMouseEnter={() => setHovered(k)}
                  onClick={() => setMonth(monthOf(k))}
                  className={cn(
                    "aspect-square cursor-pointer rounded-[2px] -outline-offset-1",
                    hovered === k
                      ? "outline-2 outline-primary"
                      : isInMonth(k, month) &&
                          "outline-1 outline-border-strong",
                  )}
                />
              ),
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3">
        <span>
          {active} of {past} days with spending
        </span>
        <HeatLegend
          size={11}
          titles={[
            "$0",
            `≤ ${money0(thresholds[0])}`,
            `≤ ${money0(thresholds[1])}`,
            `≤ ${money0(thresholds[2])}`,
            `> ${money0(thresholds[2])}`,
          ]}
        />
      </div>
    </>
  );
}
