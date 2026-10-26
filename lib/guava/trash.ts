import type { DeletedTxn, Txn } from "./types";

// Recently deleted: deleted expenses stay restorable this many days, then
// are deleted for good (see lib/guava/server/trash.ts).

export const TRASH_DAYS = 30;

const DAY_MS = 86_400_000;

/**
 * Whole days left (rounded up) before an expense deleted at `deletedAt` is
 * gone for good: 30 right after deleting, 1 on its last day.
 */
export function daysLeft(deletedAt: string, now = Date.now()): number {
  const ms = Date.parse(deletedAt) + TRASH_DAYS * DAY_MS - now;
  return Math.max(0, Math.ceil(ms / DAY_MS));
}

/** A Recently deleted expense as a live one again. */
export function restoredTxn(t: DeletedTxn): Txn {
  const copy: Partial<DeletedTxn> = { ...t };
  delete copy.deletedAt;
  return copy as Txn;
}
