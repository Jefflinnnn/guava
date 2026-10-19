"use client";

import { Trash2 } from "lucide-react";

import { ProgressBar } from "@/components/guava/progress-bar";
import { Button } from "@/components/ui/button";
import { money0Fit, percent, plural } from "@/lib/guava/format";
import type { SubStat } from "@/lib/guava/selectors";

import { pressable } from "./pressable";

const AMOUNT_CHARS = 7;

/** One subcategory in an expanded category card. Clicking it opens Edit. */
export function SubcategoryRow({
  stat: { sub, spent, count },
  categorySpent,
  color,
  onEdit,
  onDelete,
}: {
  stat: SubStat;
  /** The parent category's spend; the bar shows this subcategory's share of it. */
  categorySpent: number;
  color: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const share = categorySpent ? spent / categorySpent : 0;
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
        value={share}
        max={1}
        color={color}
        height={4}
        className="bg-border"
      />
      <div className="text-right">
        <div className="text-[13px] font-semibold whitespace-nowrap tabular">
          {money0Fit(spent, AMOUNT_CHARS)}
        </div>
        <div className="text-[11px] text-ink-3 tabular">{percent(share)}</div>
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
