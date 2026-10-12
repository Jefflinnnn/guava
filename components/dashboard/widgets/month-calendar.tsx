"use client";

import { useState } from "react";

import { MonthCalendarGrid } from "@/components/guava/month-calendar-grid";
import { useDailyTotals, useSelectedMonth } from "@/lib/guava/store";
import type { DateKey } from "@/lib/guava/types";

import { dayDetail } from "../day-caption";
import { WidgetHeader } from "./widget-header";

/** The selected month as a heat-shaded calendar; hover a day for details. */
export function MonthCalendarWidget() {
  const [month] = useSelectedMonth();
  const { daily } = useDailyTotals();
  const [hovered, setHovered] = useState<DateKey | null>(null);
  return (
    <>
      <WidgetHeader
        title="Monthly calendar"
        subtitle={
          hovered
            ? dayDetail(hovered, daily.get(hovered))
            : "Daily spend · darker means more"
        }
      />
      <MonthCalendarGrid
        month={month}
        variant="widget"
        hoveredKey={hovered}
        onHoverChange={setHovered}
        className="mt-4"
      />
    </>
  );
}
