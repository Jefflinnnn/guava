import "server-only";

import type { UserDb } from "@/lib/user-db/client";

import type { DateKey, Snapshot, Txn } from "../types";
import { purgeExpiredExpenses } from "./trash";
import { isWidgetList } from "../widgets";

// Expense dates are Postgres `date` columns. Prisma reads and writes them as
// UTC midnight, so convert through UTC to keep the calendar day intact.

export function dateFromDb(d: Date): DateKey {
  return d.toISOString().slice(0, 10);
}

export function dateToDb(key: DateKey): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

/**
 * Loads everything the app shows from the user's own database, after
 * emptying Recently deleted of anything past its 30 days.
 */
export async function loadSnapshot(db: UserDb): Promise<Snapshot> {
  await purgeExpiredExpenses(db);
  const [cats, expenses, accounts, settings] = await Promise.all([
    db.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        color: true,
        locked: true,
        subs: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: { id: true, name: true },
        },
      },
    }),
    db.expense.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        date: true,
        name: true,
        amountCents: true,
        categoryId: true,
        subcategoryId: true,
        needsReview: true,
        note: true,
        spending: true,
        bankCategory: true,
        bankAccountId: true,
        deletedAt: true,
      },
    }),
    db.bankAccount.findMany({
      orderBy: [{ institutionName: "asc" }, { name: "asc" }],
      select: {
        id: true,
        institutionName: true,
        name: true,
        nickname: true,
        mask: true,
        type: true,
        subtype: true,
      },
    }),
    db.settings.findUnique({ where: { id: 1 } }),
  ]);

  return {
    cats,
    accounts: accounts.map((a) => ({
      id: a.id,
      bank: a.institutionName,
      name: a.name,
      nickname: a.nickname,
      mask: a.mask,
      type: a.type,
      subtype: a.subtype,
    })),
    txns: expenses.filter((e) => !e.deletedAt).map(toTxn),
    deleted: expenses
      .filter((e) => e.deletedAt)
      .sort((a, b) => b.deletedAt!.getTime() - a.deletedAt!.getTime())
      .map((e) => ({ ...toTxn(e), deletedAt: e.deletedAt!.toISOString() })),
    settings: {
      autoBills: settings?.autoCategorizeBills ?? true,
      weekly: settings?.weeklyReminder ?? true,
      big: settings?.bigPurchaseAlert ?? false,
    },
    widgets: isWidgetList(settings?.widgets) ? settings.widgets : [],
  };
}

function toTxn(e: {
  id: string;
  date: Date;
  name: string;
  amountCents: number;
  categoryId: string | null;
  subcategoryId: string | null;
  needsReview: boolean;
  note: string;
  spending: boolean;
  bankCategory: string | null;
  bankAccountId: string | null;
}): Txn {
  return {
    id: e.id,
    date: dateFromDb(e.date),
    name: e.name,
    amountCents: e.amountCents,
    catId: e.categoryId,
    subId: e.subcategoryId,
    needsReview: e.needsReview,
    note: e.note,
    spending: e.spending,
    bankCategory: e.bankCategory,
    accountId: e.bankAccountId,
  };
}
