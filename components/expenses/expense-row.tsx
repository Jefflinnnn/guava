"use client";

import { Check, RotateCcw } from "lucide-react";

import { CategoryTag } from "@/components/guava/chip";
import { InitialAvatar } from "@/components/guava/initial-avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate } from "@/lib/guava/dates";
import { money, plural } from "@/lib/guava/format";
import { canMarkReviewed, notSpendingLabel } from "@/lib/guava/spending";
import { accountName, accountTitle } from "@/lib/guava/accounts";
import type { Account, Cat, Txn } from "@/lib/guava/types";
import { UNCATEGORIZED } from "@/lib/guava/uncategorized";
import { cn } from "@/lib/utils";

import { EXPENSE_GRID } from "./layout";

export type ExpenseRowVariant = "review" | "reviewed" | "deleted";

/**
 * One expense in the table. `review` rows are bold with a pink left bar and a
 * ✓ action; `reviewed` rows are muted with a ↺ action; `deleted` rows (in
 * Recently deleted) show the days left and a restore action, and don't open
 * the editor. Clicking the row opens the editor; the checkbox and action
 * button don't.
 */
export function ExpenseRow({
  txn,
  cat,
  account,
  variant,
  selected,
  onSelectedChange,
  onOpen,
  onToggleReview,
  daysLeft,
}: {
  txn: Txn;
  cat: Cat | undefined;
  /**
   * The bank account it came from: null when typed in, undefined when the
   * Bank, Card and Last 4 columns are hidden.
   */
  account: Account | null | undefined;
  variant: ExpenseRowVariant;
  selected: boolean;
  /** `range` is true for a shift-click, which selects the rows in between. */
  onSelectedChange: (on: boolean, range: boolean) => void;
  onOpen?: () => void;
  /** The action button: ✓ / ↺ between the sections, or restore. */
  onToggleReview: () => void;
  /** For `deleted` rows: days until it's deleted for good. */
  daysLeft?: number;
}) {
  const review = variant === "review";
  const deleted = variant === "deleted";
  const { name: catName, color } = cat ?? UNCATEGORIZED;
  const sub = txn.subId ? cat?.subs.find((s) => s.id === txn.subId) : null;
  // Uncategorized spending can't be marked reviewed until it gets a category.
  const canReview = canMarkReviewed(txn);
  const toggleLabel = deleted
    ? "Restore"
    : !review
      ? "Move back to Needs review"
      : canReview
        ? "Mark reviewed"
        : "Pick a category to mark it reviewed";

  return (
    <div
      {...(onOpen && {
        role: "button",
        tabIndex: 0,
        "aria-label": `Edit ${txn.name}`,
        onClick: onOpen,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (
            e.target === e.currentTarget &&
            (e.key === "Enter" || e.key === " ")
          ) {
            e.preventDefault();
            onOpen();
          }
        },
      })}
      className={cn(
        EXPENSE_GRID[account === undefined ? "plain" : "accounts"],
        "h-13 border-b border-muted text-sm outline-none focus-visible:bg-muted",
        onOpen && "cursor-pointer",
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
          // onClick rather than onCheckedChange, to see the shift key. Space
          // on the focused checkbox clicks it too.
          onClick={(e) => onSelectedChange(!selected, e.shiftKey)}
          // Keeps shift-click from also selecting the page's text.
          onMouseDown={(e) => e.shiftKey && e.preventDefault()}
        />
      </div>

      <span className="tabular">{formatDate(txn.date)}</span>

      <div className="flex min-w-0 items-center gap-2.5">
        <InitialAvatar
          name={txn.name}
          className={cn(!review && "border-transparent font-medium text-ink-3")}
        />
        <span className="truncate">{txn.name}</span>
        {!txn.spending && (
          <span
            title="Not counted in totals"
            className="inline-flex h-5 shrink-0 items-center rounded-full bg-muted px-2 text-xs font-medium text-ink-3"
          >
            {notSpendingLabel(txn.bankCategory)}
          </span>
        )}
      </div>

      {account !== undefined && <AccountCells account={account} />}

      <span
        className={cn(
          "tabular",
          !txn.spending
            ? "font-normal text-ink-3"
            : txn.amountCents < 0 && "text-success",
        )}
      >
        {money(txn.amountCents)}
      </span>

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

      {deleted ? (
        <span className="justify-self-start text-xs text-ink-3">
          {daysLeft ? `Deletes in ${plural(daysLeft, "day")}` : "Deletes today"}
        </span>
      ) : review ? (
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
        disabled={review && !canReview}
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

/** Bank · Card · Last 4, or dashes for an expense typed in by hand. */
function AccountCells({ account }: { account: Account | null }) {
  const cell = "truncate pr-2.5 text-[13px] font-normal";
  if (!account)
    return (
      <>
        <span className={cn(cell, "text-faint")}>—</span>
        <span className={cn(cell, "text-faint")}>—</span>
        <span className={cn(cell, "text-faint")}>—</span>
      </>
    );
  return (
    <>
      <span className={cn(cell, "text-ink-2")}>{account.bank ?? "Bank"}</span>
      <span className={cn(cell, "text-ink-2")} title={accountTitle(account)}>
        {accountName(account)}
      </span>
      <span
        className={cn(cell, account.mask ? "text-ink-2 tabular" : "text-faint")}
      >
        {account.mask ? `••${account.mask}` : "—"}
      </span>
    </>
  );
}
