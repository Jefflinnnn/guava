"use client";

import { Trash2 } from "lucide-react";

import { ProgressBar } from "@/components/guava/progress-bar";
import { Button } from "@/components/ui/button";
import { money0Fit, plural } from "@/lib/guava/format";
import type { SubStat } from "@/lib/guava/selectors";

import { BudgetLeft } from "./budget-left";
import { pressable } from "./pressable";

const AMOUNT_CHARS = 7;

/** One subcategory in an expanded category card. Clicking it opens Edit. */
export function SubcategoryRow({
  stat: { sub, spent, count },
  color,
  onEdit,
  onDelete,
}: {
  stat: SubStat;
  color: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const budget = sub.budgetCents;
  return (
    <div
      {...pressable(onEdit)}
      aria-label={`Edit ${sub.name}`}
      className="grid cursor-pointer grid-cols-[minmax(0,1fr)_minmax(56px,160px)_auto_32px] items-center gap-3.5 rounded-lg py-2 pl-2 transition-colors outline-none hover:bg-card focus-visible:ring-3 focus-visible:ring-ring/50 sm:grid-cols-[minmax(0,1fr)_minmax(80px,160px)_120px_32px]"
    >
      <div className="min-w-0">
        <div className="truncate font-medium">{sub.name}</div>
        <div className="text-xs text-ink-3">{plural(count, "transaction")}</div>
      </div>
      <ProgressBar
        value={spent}
        max={budget}
        color={color}
        height={4}
        noBudget="empty"
        className="bg-border"
      />
      <div className="text-right">
        <div className="text-[13px] font-semibold whitespace-nowrap tabular">
          {money0Fit(spent, AMOUNT_CHARS)}{" "}
          <span className="font-normal text-ink-3">
            / {budget ? money0Fit(budget, AMOUNT_CHARS) : "No budget"}
          </span>
        </div>
        {budget > 0 && (
          <BudgetLeft
            spent={spent}
            budget={budget}
            maxChars={AMOUNT_CHARS}
            className="text-[11px]"
          />
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Delete subcategory"
        aria-label={`Delete ${sub.name}`}
        className="text-faint hover:bg-danger-soft hover:text-danger"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="size-[15px]" />
      </Button>
    </div>
  );
}
