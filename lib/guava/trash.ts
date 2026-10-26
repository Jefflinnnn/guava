import { addDays } from "./dates";
import type { DateKey, DeletedTxn, Txn } from "./types";

// Recently deleted: deleted expenses stay restorable this many days, then
// are deleted for good (see lib/guava/server/trash.ts).

export const TRASH_DAYS = 30;

/** Days left before an expense deleted on `deletedOn` is gone for good. */
export function daysLeft(deletedOn: DateKey, today: DateKey): number {
  const last = addDays(deletedOn, TRASH_DAYS);
  const ms = Date.parse(`${last}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000));
}

/** A Recently deleted expense as a live one again. */
export function restoredTxn(t: DeletedTxn): Txn {
  const copy: Partial<DeletedTxn> = { ...t };
  delete copy.deletedOn;
  return copy as Txn;
}
