"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { HeatLegend } from "@/components/guava/heat";
import { MonthCalendarGrid } from "@/components/guava/month-calendar-grid";
import { Button } from "@/components/ui/button";
import { PopoverContent } from "@/components/ui/popover";
import {
  addMonths,
  compareMonths,
  isInMonth,
  monthLabel,
  monthOf,
  monthShortLabel,
} from "@/lib/guava/dates";
import { moneyFit } from "@/lib/guava/format";
import { useDailyTotals, useMonthBounds, useToday } from "@/lib/guava/store";
import type { DateKey, Month } from "@/lib/guava/types";
import { cn } from "@/lib/utils";

import { dayDetailShort } from "./day-caption";

/**
 * Body of the Spend Calendar popover. It pages its own month; nothing
 * changes on the dashboard until a day or "View …" is picked.
 * Mount it fresh on each open (Radix unmounts closed content) and pass the
 * dashboard's month as `initialMonth`.
 */
export function SpendCalendarPopover({
  initialMonth,
  onPick,
}: {
  initialMonth: Month;
  /** Applies a month to the dashboard and closes the popover. */
  onPick: (month: Month) => void;
}) {
  const { daily } = useDailyTotals();
  const today = useToday();
  const bounds = useMonthBounds();
  const [month, setMonth] = useState(initialMonth);
  const [hovered, setHovered] = useState<DateKey | null>(null);

  const page = (m: Month) => {
    setMonth(m);
    setHovered(null);
  };

  let spent = 0;
  for (const [k, d] of daily)
    if (isInMonth(k, month) && k <= today) spent += d.sum;

  return (
    <PopoverContent
      align="end"
      sideOffset={8}
      className="w-[332px] max-w-[calc(100vw-32px)] gap-2.5 rounded-xl p-3.5 shadow-picker"
    >
      <div className="flex items-center gap-1.5">
        <PageButton
          label="Previous month"
          disabled={compareMonths(month, bounds.min) <= 0}
          onClick={() => page(addMonths(month, -1))}
        >
          <ChevronLeft />
        </PageButton>
        <div className="flex-1 text-center">
          <div className="font-semibold">{monthLabel(month)}</div>
          <div className="text-xs text-ink-3 tabular">
            {moneyFit(spent, 11)} spent
          </div>
        </div>
        <PageButton
          label="Next month"
          disabled={compareMonths(month, bounds.max) >= 0}
          onClick={() => page(addMonths(month, 1))}
        >
          <ChevronRight />
        </PageButton>
      </div>

      <MonthCalendarGrid
        month={month}
        variant="picker"
        hoveredKey={hovered}
        onHoverChange={setHovered}
        onPick={(k) => onPick(monthOf(k))}
      />

      <div className="flex min-h-[18px] items-center justify-between gap-2 border-t pt-2 text-xs text-ink-3">
        <span className={cn("truncate", hovered && "text-foreground")}>
          {hovered
            ? dayDetailShort(hovered, daily.get(hovered))
            : "Darker days mean more spent"}
        </span>
        <HeatLegend />
      </div>

      <div className="flex justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => page(monthOf(today))}
        >
          This month
        </Button>
        <Button size="sm" className="text-xs" onClick={() => onPick(month)}>
          View {monthShortLabel(month)}
        </Button>
      </div>
    </PopoverContent>
  );
}

function PageButton({
  label,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      className="text-primary-text hover:bg-muted hover:text-primary-text disabled:opacity-35"
      {...props}
    />
  );
}
