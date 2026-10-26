import "server-only";

import type { PlaidApi, RemovedTransaction, Transaction } from "plaid";

import type { Prisma } from "@/generated/user-prisma/client";

import { decrypt } from "@/lib/crypto";
import { dateToDb } from "@/lib/guava/server/snapshot";
import { plaidErrorCode } from "@/lib/plaid";
import { mapTransaction, type ImportedExpense } from "@/lib/plaid-mapping";
import type { UserDb } from "@/lib/user-db/client";

export type SyncCounts = { added: number; updated: number; removed: number };

/** Plaid's page size limit for /transactions/sync. */
const PAGE_SIZE = 500;

/**
 * Pulls everything that changed since the item's cursor. Plaid asks for a
 * restart from the original cursor if data changes mid-pagination.
 */
async function fetchChanges(
  plaid: PlaidApi,
  accessToken: string,
  from?: string,
) {
  for (let attempt = 0; ; attempt++) {
    const added: Transaction[] = [];
    const modified: Transaction[] = [];
    const removed: RemovedTransaction[] = [];
    let cursor = from;
    try {
      for (;;) {
        const { data } = await plaid.transactionsSync({
          access_token: accessToken,
          cursor,
          count: PAGE_SIZE,
        });
        added.push(...data.added);
        modified.push(...data.modified);
        removed.push(...data.removed);
        cursor = data.next_cursor;
        if (!data.has_more) break;
      }
      return { added, modified, removed, cursor };
    } catch (error) {
      const restart =
        plaidErrorCode(error) ===
        "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION";
      if (!restart || attempt >= 2) throw error;
    }
  }
}

/**
 * Syncs one bank connection into the user's database.
 *
 * New transactions become uncategorized expenses that need review. Changes
 * from the bank update only the amount, date, account and bank category, so
 * a name, category, note or "counts as spending" choice the user made is kept. A posted transaction that replaces
 * a pending one takes over the pending expense, keeping the user's edits.
 * Transactions the bank removed, or that stop qualifying (see
 * lib/plaid-mapping.ts), are deleted.
 */
export async function syncItem(
  db: UserDb,
  plaid: PlaidApi,
  itemId: string,
): Promise<SyncCounts> {
  const item = await db.plaidItem.findUniqueOrThrow({
    where: { id: itemId },
    select: { accessToken: true, cursor: true },
  });
  const changes = await fetchChanges(
    plaid,
    decrypt(item.accessToken),
    item.cursor ?? undefined,
  );

  const accounts = await db.bankAccount.findMany({
    where: { itemId },
    select: { id: true, plaidAccountId: true },
  });
  const accountId = new Map(accounts.map((a) => [a.plaidAccountId, a.id]));

  const upserts: ImportedExpense[] = [];
  const deletes = new Set(changes.removed.map((r) => r.transaction_id));
  for (const t of [...changes.added, ...changes.modified]) {
    const mapped = mapTransaction(t);
    if (typeof mapped === "string") deletes.add(t.transaction_id);
    else upserts.push(mapped);
  }

  const lookupIds = upserts.flatMap((u) =>
    u.replacesPendingId
      ? [u.plaidTransactionId, u.replacesPendingId]
      : [u.plaidTransactionId],
  );
  const existing = new Map(
    (
      await db.expense.findMany({
        where: { plaidTransactionId: { in: lookupIds } },
        select: { id: true, plaidTransactionId: true },
      })
    ).map((e) => [e.plaidTransactionId!, e.id]),
  );

  const counts: SyncCounts = { added: 0, updated: 0, removed: 0 };
  const creates: Prisma.ExpenseCreateManyInput[] = [];
  const updates: { id: string; data: Prisma.ExpenseUncheckedUpdateInput }[] =
    [];
  for (const u of upserts) {
    const fields = {
      date: dateToDb(u.date),
      amountCents: u.amountCents,
      bankAccountId: accountId.get(u.plaidAccountId) ?? null,
      bankCategory: u.bankCategory,
    };
    const ownId = existing.get(u.plaidTransactionId);
    const pendingId = u.replacesPendingId
      ? existing.get(u.replacesPendingId)
      : undefined;
    const id = ownId ?? pendingId;
    if (id) {
      updates.push({
        id,
        data: { ...fields, plaidTransactionId: u.plaidTransactionId },
      });
      // The pending row was taken over (renamed), so there's nothing left
      // to delete under its old id.
      if (!ownId && u.replacesPendingId) deletes.delete(u.replacesPendingId);
    } else {
      creates.push({
        ...fields,
        name: u.name,
        spending: u.spending,
        plaidTransactionId: u.plaidTransactionId,
        needsReview: true,
      });
    }
  }
  for (const u of upserts) deletes.delete(u.plaidTransactionId);

  await db.$transaction(
    async (tx) => {
      for (const { id, data } of updates) {
        await tx.expense.update({ where: { id }, data });
      }
      if (creates.length) {
        counts.added = (
          await tx.expense.createMany({ data: creates, skipDuplicates: true })
        ).count;
      }
      if (deletes.size) {
        counts.removed = (
          await tx.expense.deleteMany({
            where: { plaidTransactionId: { in: [...deletes] } },
          })
        ).count;
      }
      await tx.plaidItem.update({
        where: { id: itemId },
        data: { cursor: changes.cursor, lastSyncedAt: new Date() },
      });
    },
    { timeout: 30_000 },
  );
  counts.updated = updates.length;
  return counts;
}
