"use client";

import { Check, CircleCheck } from "lucide-react";

import { Card } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { useCatById } from "@/lib/guava/store";
import type { Txn } from "@/lib/guava/types";

import { ExpenseRow, type ExpenseRowVariant } from "./expense-row";
import {
  ReviewDot,
  SectionAction,
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

  const rows = (list: Txn[], variant: ExpenseRowVariant) =>
    list.map((t) => (
      <ExpenseRow
        key={t.id}
        txn={t}
        cat={catById.get(t.catId)}
        variant={variant}
        selected={view.selectedSet.has(t.id)}
        onSelectedChange={(on) => view.toggleSelected(t.id, on)}
        onOpen={() => onOpen(t)}
        onToggleReview={() =>
          view.setNeedsReview([t.id], variant === "reviewed")
        }
      />
    ));

  const { review, reviewed, reviewedShown } = view;

  return (
    <Card className="overflow-x-auto">
      <div className={TABLE_MIN_WIDTH}>
        <ExpenseTableHeader view={view} />

        {view.showReview && (
          <section aria-label="Needs review">
            <SectionHeader
              marker={<ReviewDot />}
              title="Needs review"
              count={review.length}
              action={
                review.length > 0 && (
                  <SectionAction
                    onClick={() =>
                      view.setNeedsReview(
                        review.map((t) => t.id),
                        false,
                      )
                    }
                  >
                    Mark all reviewed
                  </SectionAction>
                )
              }
            />
            {rows(review, "review")}
            {review.length === 0 && (
              <SectionMessage icon={<CircleCheck />}>
                All caught up — nothing to review.
              </SectionMessage>
            )}
          </section>
        )}

        {view.showReviewed && (
          <section aria-label="Reviewed">
            <SectionHeader
              marker={<Check className="size-3.5 text-ink-3" />}
              title="Reviewed"
              count={reviewed.length}
            />
            {rows(reviewedShown, "reviewed")}
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
          </section>
        )}
      </div>
    </Card>
  );
}
