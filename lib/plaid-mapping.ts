import type { Transaction } from "plaid";

import { EXPENSE_CAP_CENTS } from "@/lib/guava/money-input";
import type { DateKey } from "@/lib/guava/types";

// How a Plaid transaction becomes a guava expense. Pure, so it can be checked
// against Plaid's sample data without a database.

/** Expense names are VARCHAR(40). */
const NAME_MAX = 40;

/**
 * Plaid categories that move money between the user's own accounts rather
 * than spend it. Importing them would count spending twice: a card purchase,
 * then again as the card payment from checking.
 */
const NOT_SPENDING = new Set(["TRANSFER_IN", "TRANSFER_OUT", "LOAN_PAYMENTS"]);

/** Why a transaction wasn't imported, or null when it was. */
export type SkipReason = "money-in" | "transfer" | "too-large";

export type ImportedExpense = {
  plaidTransactionId: string;
  plaidAccountId: string;
  /** The pending transaction this posted one replaces, if any. */
  replacesPendingId: string | null;
  date: DateKey;
  name: string;
  amountCents: number;
};

/**
 * Maps one Plaid transaction to an expense, or says why it's skipped.
 *
 * - Plaid amounts are dollars, positive for money out. Money in (refunds,
 *   income, a friend paying you back) is skipped for now.
 * - Transfers and loan or card payments are skipped (see `NOT_SPENDING`).
 * - The merchant name is preferred over the raw bank description.
 * - `date` is when the bank posted it, which matches statements.
 */
export function mapTransaction(
  t: Pick<
    Transaction,
    | "transaction_id"
    | "account_id"
    | "pending_transaction_id"
    | "amount"
    | "date"
    | "name"
    | "merchant_name"
    | "personal_finance_category"
  >,
): ImportedExpense | SkipReason {
  const category = t.personal_finance_category?.primary;
  if (category && NOT_SPENDING.has(category)) return "transfer";
  const amountCents = Math.round(t.amount * 100);
  if (amountCents <= 0) return "money-in";
  if (amountCents > EXPENSE_CAP_CENTS) return "too-large";
  return {
    plaidTransactionId: t.transaction_id,
    plaidAccountId: t.account_id,
    replacesPendingId: t.pending_transaction_id ?? null,
    date: t.date as DateKey,
    name: expenseName(t.merchant_name, t.name),
    amountCents,
  };
}

function expenseName(merchant: string | null | undefined, raw: string) {
  const name = (merchant?.trim() || raw.trim() || "Bank transaction")
    .replace(/\s+/g, " ")
    .slice(0, NAME_MAX)
    .trim();
  return name;
}
