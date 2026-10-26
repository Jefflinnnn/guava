import type { Transaction } from "plaid";

import { EXPENSE_CAP_CENTS } from "@/lib/guava/money-input";
import type { DateKey } from "@/lib/guava/types";

// How a Plaid transaction becomes a guava expense. Pure, so it can be checked
// against Plaid's sample data without a database.

/** Expense names are VARCHAR(40). */
const NAME_MAX = 40;
/** Expense bank categories are VARCHAR(64). */
const BANK_CATEGORY_MAX = 64;

/**
 * Plaid categories that aren't spending. They're imported so the user sees
 * every transaction, but left out of totals: transfers and card payments move
 * money between the user's own accounts (counting them would count a card
 * purchase twice), and income isn't spending at all.
 */
const NOT_SPENDING = new Set([
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "LOAN_PAYMENTS",
  "INCOME",
]);

/** Why a transaction wasn't imported. */
export type SkipReason = "zero" | "too-large";

export type ImportedExpense = {
  plaidTransactionId: string;
  plaidAccountId: string;
  /** The pending transaction this posted one replaces, if any. */
  replacesPendingId: string | null;
  date: DateKey;
  name: string;
  /** Positive for money out, negative for money in (refunds, income). */
  amountCents: number;
  /** Whether it counts toward spending totals (see `NOT_SPENDING`). */
  spending: boolean;
  /** Plaid's detailed category, e.g. LOAN_PAYMENTS_CREDIT_CARD_PAYMENT. */
  bankCategory: string | null;
};

/**
 * Maps one Plaid transaction to an expense, or says why it's skipped.
 *
 * - Plaid amounts are dollars, positive for money out. Money back from a
 *   merchant is a refund: a negative expense, so totals net out.
 * - Transfers, loan or card payments and income are imported as not spending
 *   (see `NOT_SPENDING`); the user can change that per expense.
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
  const category = t.personal_finance_category;
  const amountCents = Math.round(t.amount * 100);
  // Zero-amount rows (authorizations, adjustments) carry no spending.
  if (amountCents === 0) return "zero";
  if (Math.abs(amountCents) > EXPENSE_CAP_CENTS) return "too-large";
  return {
    plaidTransactionId: t.transaction_id,
    plaidAccountId: t.account_id,
    replacesPendingId: t.pending_transaction_id ?? null,
    date: t.date as DateKey,
    name: expenseName(t.merchant_name, t.name),
    amountCents,
    spending: !NOT_SPENDING.has(category?.primary ?? ""),
    bankCategory: category?.detailed?.slice(0, BANK_CATEGORY_MAX) || null,
  };
}

function expenseName(merchant: string | null | undefined, raw: string) {
  const name = (merchant?.trim() || raw.trim() || "Bank transaction")
    .replace(/\s+/g, " ")
    .slice(0, NAME_MAX)
    .trim();
  return name;
}
