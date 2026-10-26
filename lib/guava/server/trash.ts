import "server-only";

import type { UserDb } from "@/lib/user-db/client";

import { TRASH_DAYS } from "../trash";

/**
 * Deletes expenses for good. Bank transactions among them are remembered, so
 * syncing doesn't import them again (see lib/plaid-sync.ts).
 */
export async function purgeExpenses(
  db: UserDb,
  where: { id?: { in: string[] }; deletedAt: { not: null } | { lt: Date } },
) {
  await db.$transaction(async (tx) => {
    const bank = await tx.expense.findMany({
      where: { ...where, plaidTransactionId: { not: null } },
      select: { plaidTransactionId: true },
    });
    if (bank.length) {
      await tx.deletedBankTransaction.createMany({
        data: bank.map((e) => ({ plaidTransactionId: e.plaidTransactionId! })),
        skipDuplicates: true,
      });
    }
    await tx.expense.deleteMany({ where });
  });
}

/**
 * Empties Recently deleted of expenses deleted more than TRASH_DAYS ago. Runs
 * whenever the app loads (there's no background job: each user's data lives
 * in their own database).
 */
export async function purgeExpiredExpenses(db: UserDb) {
  const cutoff = new Date(Date.now() - TRASH_DAYS * 86_400_000);
  const expired = await db.expense.count({
    where: { deletedAt: { lt: cutoff } },
  });
  if (expired) await purgeExpenses(db, { deletedAt: { lt: cutoff } });
}
