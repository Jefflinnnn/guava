"use client";

import { daysInMonth, firstWeekday, keyOf, TODAY, WEEKDAYS_SHORT } from "@/lib/guava/dates";
import { calendarAmount } from "@/lib/guava/format";
import { HEAT_CLASSES, heatLevel } from "@/lib/guava/heat";
import { useDailyTotals } from "@/lib/guava/store";
import type { DateKey, Month } from "@/lib/guava/types";
import { cn } from "@/lib/utils";

const VARIANTS = {
  // Spend Calendar popover: 40px cells, today outlined, blank future days.
  picker: {
    cell: "h-10 rounded-[7px] px-[5px] py-1",
    amount: "text-[9.5px]",
    future: "bg-transparent text-faint",
    zero: "",
    markToday: true,
  },
  // Monthly calendar widget: 46px cells, "—" for no spend, greyed future days.
  widget: {
    cell: "h-[46px] rounded-md px-1.5 py-[5px]",
    amount: "text-[10.5px]",
    future: "bg-surface text-border-strong",
    zero: "—",
    markToday: false,
  },
} as const;

/**
 * A 7-column month grid with each past day shaded by spend and a compact
 * amount in the corner. Shared by the Spend Calendar popover and the Monthly
 * calendar widget.
 */
export function MonthCalendarGrid({
  month,
  variant,
  hoveredKey,
  onHoverChange,
  onPick,
  className,
}: {
  month: Month;
  variant: keyof typeof VARIANTS;
  hoveredKey?: DateKey | null;
  onHoverChange?: (key: DateKey | null) => void;
  /** Makes past days clickable. */
  onPick?: (key: DateKey) => void;
  className?: string;
}) {
  const { daily, thresholds } = useDailyTotals();
  const v = VARIANTS[variant];
  const lead = firstWeekday(month);
  const days = Array.from({ length: daysInMonth(month) }, (_, i) => keyOf(month.year, month.month, i + 1));

  return (
    <div className={cn("grid grid-cols-7 gap-1", className)} onMouseLeave={() => onHoverChange?.(null)}>
      {WEEKDAYS_SHORT.map((d) => (
        <div key={d} className="pb-1 text-center text-[11px] text-ink-3">
          {d}
        </div>
      ))}
      {Array.from({ length: lead }, (_, i) => (
        <div key={`pad${i}`} />
      ))}
      {days.map((key, i) => {
        const future = key > TODAY;
        const sum = daily.get(key)?.sum ?? 0;
        const isToday = key === TODAY;
        const Tag = onPick && !future ? "button" : "div";
        return (
          <Tag
            key={key}
            type={Tag === "button" ? "button" : undefined}
            onClick={onPick && !future ? () => onPick(key) : undefined}
            onMouseEnter={future ? undefined : () => onHoverChange?.(key)}
            className={cn(
              "flex flex-col justify-between text-left outline-offset-1",
              v.cell,
              future ? v.future : HEAT_CLASSES[heatLevel(sum, thresholds)],
              Tag === "button" && "cursor-pointer",
              hoveredKey === key ? "outline-2 outline-primary" : v.markToday && isToday && "outline-1 outline-primary"
            )}
          >
            <span className={cn("text-[11px] leading-none", v.markToday && isToday ? "font-bold" : "font-medium")}>{i + 1}</span>
            <span className={cn("overflow-hidden text-right font-mono leading-none whitespace-nowrap", v.amount)}>
              {future ? "" : sum ? calendarAmount(sum) : v.zero}
            </span>
          </Tag>
        );
      })}
    </div>
  );
}
