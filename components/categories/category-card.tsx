"use client";

import { ChevronRight, Lock, Plus, Trash2 } from "lucide-react";

import { CategoryTile } from "@/components/guava/category-swatch";
import { ProgressBar } from "@/components/guava/progress-bar";
import { Card } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { money0Fit, plural } from "@/lib/guava/format";
import type { CategoryStat } from "@/lib/guava/selectors";
import { cn } from "@/lib/utils";

import { BudgetLeft } from "./budget-left";
import { pressable } from "./pressable";
import { SubcategoryRow } from "./subcategory-row";

const AMOUNT_CHARS = 8;

export type CategoryCardHandlers = {
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddSub: () => void;
  onEditSub: (subId: string) => void;
  onDeleteSub: (subId: string) => void;
};

/** An expandable category: budget summary on top, subcategories below. */
export function CategoryCard({
  stat,
  expanded,
  ...handlers
}: CategoryCardHandlers & { stat: CategoryStat; expanded: boolean }) {
  return (
    <Card className="overflow-hidden">
      <CategoryCardHeader
        stat={stat}
        expanded={expanded}
        onToggle={handlers.onToggle}
        onDelete={handlers.onDelete}
      />
      {expanded && <SubcategoryPanel stat={stat} {...handlers} />}
    </Card>
  );
}

function CategoryCardHeader({
  stat: { cat, spent, count },
  expanded,
  onToggle,
  onDelete,
}: {
  stat: CategoryStat;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      {...pressable(onToggle)}
      aria-expanded={expanded}
      className="grid cursor-pointer grid-cols-[16px_36px_minmax(0,1fr)_auto_auto] items-center gap-3 py-4 pr-3 pl-4 transition-colors outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset sm:gap-3.5"
    >
      <ChevronRight
        aria-hidden
        className={cn(
          "size-4 text-ink-3 transition-transform duration-150",
          expanded && "rotate-90",
        )}
      />
      <CategoryTile color={cat.color} />
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="max-w-full flex-none truncate text-[15px] font-semibold">
            {cat.name}
          </span>
          <span className="min-w-0 truncate text-xs text-ink-3">
            {plural(count, "transaction")} ·{" "}
            {plural(cat.subs.length, "subcategory", "subcategories")}
          </span>
        </div>
        <ProgressBar value={spent} max={cat.budgetCents} color={cat.color} />
      </div>
      <div className="text-right sm:min-w-[110px]">
        <div className="text-lg font-semibold tabular">
          {money0Fit(cat.budgetCents, AMOUNT_CHARS)}
        </div>
        <BudgetLeft
          spent={spent}
          budget={cat.budgetCents}
          maxChars={AMOUNT_CHARS}
          className="text-xs"
        />
      </div>
      {cat.locked ? (
        <span
          title="Locked — edit category to unlock"
          className="flex size-8 items-center justify-center text-ink-3"
        >
          <Lock className="size-[15px]" />
          <span className="sr-only">Locked</span>
        </span>
      ) : (
        <Button
          variant="ghost"
          size="icon-sm"
          title="Delete category"
          aria-label={`Delete ${cat.name}`}
          className="size-8 hover:bg-danger-soft hover:text-danger"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="size-[15px]" />
        </Button>
      )}
    </div>
  );
}

function SubcategoryPanel({
  stat: { cat, subs, allocated },
  onEdit,
  onAddSub,
  onEditSub,
  onDeleteSub,
}: CategoryCardHandlers & { stat: CategoryStat }) {
  const overAllocated = allocated > cat.budgetCents;
  return (
    <div className="flex flex-col gap-1 border-t border-muted bg-surface pt-2.5 pr-3 pb-3 pl-3 sm:pl-[82px]">
      <div className="flex items-baseline justify-between gap-3 px-2 pt-1 pb-1.5 text-xs">
        <span className="font-semibold tracking-[0.02em] text-ink-3 uppercase">
          Subcategories
        </span>
        <span
          className={cn(
            "tabular",
            overAllocated ? "text-danger" : "text-ink-3",
          )}
        >
          Allocated {money0Fit(allocated, AMOUNT_CHARS)} of{" "}
          {money0Fit(cat.budgetCents, AMOUNT_CHARS)}
          {overAllocated && " · over category budget"}
        </span>
      </div>

      {subs.length ? (
        subs.map((s) => (
          <SubcategoryRow
            key={s.sub.id}
            stat={s}
            color={cat.color}
            onEdit={() => onEditSub(s.sub.id)}
            onDelete={() => onDeleteSub(s.sub.id)}
          />
        ))
      ) : (
        <p className="p-2 text-[13px] text-ink-3">No subcategories yet.</p>
      )}

      <div className="mt-1 flex justify-between gap-2 border-t border-muted pt-2 pl-2">
        <Button variant="dashed" size="sm" className="h-8" onClick={onAddSub}>
          <Plus />
          Add subcategory
        </Button>
        <Button variant="outline" size="sm" className="h-8" onClick={onEdit}>
          Edit category
        </Button>
      </div>
    </div>
  );
}
