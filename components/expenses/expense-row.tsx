"use client";

import { Check, RotateCcw } from "lucide-react";

import { CategoryTag } from "@/components/guava/chip";
import { InitialAvatar } from "@/components/guava/initial-avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate } from "@/lib/guava/dates";
import { money } from "@/lib/guava/format";
import type { Cat, Txn } from "@/lib/guava/types";
import { UNCATEGORIZED } from "@/lib/guava/uncategorized";
import { cn } from "@/lib/utils";

import { EXPENSE_GRID } from "./layout";

export type ExpenseRowVariant = "review" | "reviewed";

/**
 * One expense in the table. `review` rows are bold with a pink left bar and a
 * ✓ action; `reviewed` rows are muted with a ↺ action. Clicking the row opens
 * the editor; the checkbox and action button don't.
 */
export function ExpenseRow({
  txn,
  cat,
  variant,
  selected,
  onSelectedChange,
  onOpen,
  onToggleReview,
}: {
  txn: Txn;
  cat: Cat | undefined;
  variant: ExpenseRowVariant;
  selected: boolean;
  onSelectedChange: (on: boolean) => void;
  onOpen: () => void;
  onToggleReview: () => void;
}) {
  const review = variant === "review";
  const { name: catName, color } = cat ?? UNCATEGORIZED;
  const sub = txn.subId ? cat?.subs.find((s) => s.id === txn.subId) : null;
  // Uncategorized expenses can't be marked reviewed until they get a category.
  const toggleLabel = !review
    ? "Move back to Needs review"
    : cat
      ? "Mark reviewed"
      : "Pick a category to mark it reviewed";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Edit ${txn.name}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === "Enter" || e.key === " ")
        ) {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        EXPENSE_GRID,
        "h-13 cursor-pointer border-b border-muted text-sm outline-none focus-visible:bg-muted",
        review
          ? "bg-card font-semibold shadow-[inset_3px_0_0_var(--pink)]"
          : "bg-surface text-ink-2",
        selected ? "bg-muted" : "hover:bg-muted",
      )}
    >
      <div
        className="flex justify-center"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Checkbox
          aria-label={`Select ${txn.name}`}
          checked={selected}
          onCheckedChange={(v) => onSelectedChange(v === true)}
        />
      </div>

      <span className="tabular">{formatDate(txn.date)}</span>

      <div className="flex min-w-0 items-center gap-2.5">
        <InitialAvatar
          name={txn.name}
          className={cn(!review && "border-transparent font-medium text-ink-3")}
        />
        <span className="truncate">{txn.name}</span>
      </div>

      <span className="tabular">{money(txn.amountCents)}</span>

      <CategoryTag
        color={color}
        name={catName}
        className={cn("h-6 justify-self-start", !review && "font-normal")}
      />

      <span
        className={cn(
          "truncate pr-2.5 text-[13px] font-normal",
          sub ? "text-ink-2" : "text-faint",
        )}
      >
        {sub?.name ?? "—"}
      </span>

      {review ? (
        <span className="inline-flex h-[22px] items-center justify-self-start rounded-full bg-pink-soft px-2 text-xs font-medium text-pink-ink">
          Needs review
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 justify-self-start text-xs text-ink-3">
          <Check className="size-3.5" />
          Reviewed
        </span>
      )}

      <Button
        variant={review ? "outline" : "ghost"}
        size="icon-sm"
        title={toggleLabel}
        aria-label={toggleLabel}
        disabled={review && !cat}
        onClick={(e) => {
          e.stopPropagation();
          onToggleReview();
        }}
        onKeyDown={(e) => e.stopPropagation()}
        className={cn(
          "size-[30px]",
          review ? "text-ink-2" : "text-faint hover:bg-border",
        )}
      >
        {review ? <Check /> : <RotateCcw />}
      </Button>
    </div>
  );
}
