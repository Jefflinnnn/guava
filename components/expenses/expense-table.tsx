"use client";

import { Check, CircleCheck, Trash2 } from "lucide-react";

import { Card } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { useAccountById, useCatById, useReviewCount } from "@/lib/guava/store";
import { daysLeft, TRASH_DAYS } from "@/lib/guava/trash";
import type { DeletedTxn, Txn } from "@/lib/guava/types";

import { ExpenseRow, type ExpenseRowVariant } from "./expense-row";
import {
  ReviewDot,
  SectionFooter,
  SectionHeader,
  SectionMessage,
} from "./expense-section";
import { ExpenseTableHeader } from "./expense-table-header";
import { TABLE_MIN_WIDTH } from "./layout";
import type { ExpensesView } from "./use-expenses-view";

/**
 * The expenses card: header row, then a "Needs review" section above a paged
 * "Reviewed" section (Gmail unread/read style).
 */
export function ExpenseTable({
  view,
  onOpen,
}: {
  view: ExpensesView;
  onOpen: (txn: Txn) => void;
}) {
  const catById = useCatById();
  const accountById = useAccountById();
  const reviewCount = useReviewCount();

  const rows = (list: (Txn | DeletedTxn)[], variant: ExpenseRowVariant) =>
    list.map((t) => (
      <ExpenseRow
        key={t.id}
        txn={t}
        cat={t.catId ? catById.get(t.catId) : undefined}
        account={
          view.showAccounts
            ? t.accountId
              ? (accountById.get(t.accountId) ?? null)
              : null
            : undefined
        }
        variant={variant}
        selected={view.selectedSet.has(t.id)}
        onSelectedChange={(on, range) => view.toggleSelected(t.id, on, range)}
        onOpen={variant === "deleted" ? undefined : () => onOpen(t)}
        onToggleReview={() =>
          variant === "deleted"
            ? view.restore([t.id])
            : view.setNeedsReview([t.id], variant === "reviewed")
        }
        daysLeft={"deletedAt" in t ? daysLeft(t.deletedAt) : undefined}
      />
    ));

  const { review, reviewed, reviewedShown } = view;

  return (
    // The page scrolls, not the card, so the column and section headers can
    // stick to it. overflow-clip rounds the corners without making the card a
    // scroll area, and min-w-fit widens it (and scrolls the page sideways)
    // when the window is too narrow for the table.
    <Card className="min-w-fit overflow-clip">
      <div
        className={TABLE_MIN_WIDTH[view.showAccounts ? "accounts" : "plain"]}
      >
        <ExpenseTableHeader view={view} />

        {view.showReview && (
          <section aria-label="Needs review">
            <SectionHeader
              marker={<ReviewDot />}
              title="Needs review"
              count={review.length}
              collapsed={view.collapsed.review}
              onToggle={() => view.toggleCollapsed("review")}
            />
            {!view.collapsed.review && rows(review, "review")}
            {!view.collapsed.review && review.length === 0 && (
              <SectionMessage icon={<CircleCheck />}>
                {reviewCount
                  ? "No expenses that need review match these filters."
                  : "All caught up — nothing to review."}
              </SectionMessage>
            )}
          </section>
        )}

        {view.showDeleted && (
          <section aria-label="Recently deleted">
            <SectionHeader
              marker={<Trash2 className="size-3.5 text-ink-3" />}
              title="Recently deleted"
              count={view.deleted.length}
            />
            {rows(view.deleted, "deleted")}
            <SectionFooter>
              {`Deleted expenses stay here ${TRASH_DAYS} days, then are deleted for good.`}
            </SectionFooter>
          </section>
        )}

        {view.showReviewed && (
          <section aria-label="Reviewed">
            <SectionHeader
              marker={<Check className="size-3.5 text-ink-3" />}
              title="Reviewed"
              count={reviewed.length}
              collapsed={view.collapsed.reviewed}
              onToggle={() => view.toggleCollapsed("reviewed")}
            />
            {!view.collapsed.reviewed && rows(reviewedShown, "reviewed")}
            {!view.collapsed.reviewed && (
              <SectionFooter
                action={
                  reviewedShown.length < reviewed.length && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3"
                      onClick={view.showMoreReviewed}
                    >
                      Show more
                    </Button>
                  )
                }
              >
                {reviewed.length
                  ? `Showing ${reviewedShown.length} of ${reviewed.length} reviewed`
                  : "No reviewed expenses match these filters"}
              </SectionFooter>
            )}
          </section>
        )}
        {!view.showDeleted && view.deletedCount > 0 && (
          <button
            type="button"
            onClick={() => view.setFilters({ status: "deleted" })}
            className="flex h-11 w-full cursor-pointer items-center gap-2 border-t px-4 text-[13px] text-ink-3 hover:bg-muted hover:text-foreground"
          >
            <Trash2 className="size-3.5" />
            Recently deleted ({view.deletedCount})
          </button>
        )}
      </div>
    </Card>
  );
}
