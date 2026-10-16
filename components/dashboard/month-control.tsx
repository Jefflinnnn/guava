"use client";

import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverAnchor,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  addMonths,
  compareMonths,
  MAX_MONTH,
  MIN_MONTH,
  monthLabel,
} from "@/lib/guava/dates";
import { useSelectedMonth } from "@/lib/guava/store";
import { cn } from "@/lib/utils";

import { SpendCalendarPopover } from "./spend-calendar-popover";

/** ‹ [📅 September 2026] › — steps the dashboard month; the middle opens the Spend Calendar. */
export function MonthControl() {
  const [month, setMonth] = useSelectedMonth();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="flex h-9 items-center rounded-lg border bg-card shadow-control">
          <StepButton
            label="Previous month"
            className="rounded-l-lg"
            disabled={compareMonths(month, MIN_MONTH) <= 0}
            onClick={() => setMonth(addMonths(month, -1))}
          >
            <ChevronLeft />
          </StepButton>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-full min-w-[132px] cursor-pointer items-center justify-center gap-2 border-x px-3 font-medium transition-colors outline-none hover:bg-muted focus-visible:bg-muted data-[state=open]:bg-muted"
            >
              <Calendar className="size-[15px] text-ink-3" />
              {monthLabel(month)}
            </button>
          </PopoverTrigger>
          <StepButton
            label="Next month"
            className="rounded-r-lg"
            disabled={compareMonths(month, MAX_MONTH) >= 0}
            onClick={() => setMonth(addMonths(month, 1))}
          >
            <ChevronRight />
          </StepButton>
        </div>
      </PopoverAnchor>
      {open && (
        <SpendCalendarPopover
          initialMonth={month}
          onPick={(m) => {
            setMonth(m);
            setOpen(false);
          }}
        />
      )}
    </Popover>
  );
}

function StepButton({
  label,
  className,
  ...props
}: React.ComponentProps<"button"> & { label: string }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      className={cn(
        "size-[34px] rounded-none text-primary-text hover:bg-muted hover:text-primary-text disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}
