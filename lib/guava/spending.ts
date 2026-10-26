import type { Txn } from "./types";

// Expenses that aren't spending (card payments, transfers, income) are listed
// with the rest but left out of every total.

/**
 * Whether an expense can leave the review queue: it needs a category, unless
 * it isn't spending (a card payment has nothing to categorize).
 */
export function canMarkReviewed(t: Pick<Txn, "catId" | "spending">): boolean {
  return t.catId != null || !t.spending;
}

/** A short label for a not-spending expense, from Plaid's category. */
export function notSpendingLabel(bankCategory: string | null): string {
  if (bankCategory === "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT")
    return "Card payment";
  if (bankCategory?.startsWith("LOAN_PAYMENTS")) return "Loan payment";
  if (bankCategory?.startsWith("TRANSFER")) return "Transfer";
  if (bankCategory?.startsWith("INCOME")) return "Income";
  return "Not spending";
}
