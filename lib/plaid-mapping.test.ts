import { describe, expect, it } from "vitest";

import { mapTransaction } from "./plaid-mapping";

type Input = Parameters<typeof mapTransaction>[0];

function txn(overrides: Partial<Input> = {}): Input {
  return {
    transaction_id: "txn_1",
    account_id: "acc_1",
    pending_transaction_id: null,
    amount: 12.34,
    date: "2026-10-27",
    name: "SQ *BLUE BOTTLE COFFEE",
    merchant_name: "Blue Bottle Coffee",
    personal_finance_category: {
      primary: "FOOD_AND_DRINK",
      detailed: "FOOD_AND_DRINK_COFFEE",
      confidence_level: "VERY_HIGH",
    },
    ...overrides,
  };
}

describe("mapTransaction", () => {
  it("maps a purchase to a spending expense", () => {
    expect(mapTransaction(txn())).toEqual({
      plaidTransactionId: "txn_1",
      plaidAccountId: "acc_1",
      replacesPendingId: null,
      date: "2026-10-27",
      name: "Blue Bottle Coffee",
      amountCents: 1234,
      spending: true,
      bankCategory: "FOOD_AND_DRINK_COFFEE",
    });
  });

  it("keeps refunds as negative amounts", () => {
    const expense = mapTransaction(txn({ amount: -5.5 }));
    expect(expense).toMatchObject({ amountCents: -550, spending: true });
  });

  it("imports transfers, card payments and income as not spending", () => {
    for (const primary of ["TRANSFER_OUT", "LOAN_PAYMENTS", "INCOME"]) {
      const expense = mapTransaction(
        txn({ personal_finance_category: { primary, detailed: primary } }),
      );
      expect(expense).toMatchObject({ spending: false });
    }
  });

  it("skips zero and oversized amounts", () => {
    expect(mapTransaction(txn({ amount: 0.001 }))).toBe("zero");
    expect(mapTransaction(txn({ amount: 1_000_000 }))).toBe("too-large");
  });

  it("falls back to the bank description and fits the name column", () => {
    const expense = mapTransaction(
      txn({
        merchant_name: null,
        name: "  ACH   DEBIT   " + "X".repeat(60),
      }),
    );
    expect(expense).toMatchObject({
      name: expect.stringMatching(/^ACH DEBIT X+$/),
    });
    expect((expense as { name: string }).name).toHaveLength(40);
  });

  it("links a posted transaction to the pending one it replaces", () => {
    const expense = mapTransaction(txn({ pending_transaction_id: "txn_0" }));
    expect(expense).toMatchObject({ replacesPendingId: "txn_0" });
  });
});
