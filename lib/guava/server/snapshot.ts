import "server-only";

import type { UserDb } from "@/lib/user-db/client";

import type { DateKey, Snapshot } from "../types";
import { isWidgetList } from "../widgets";

// Expense dates are Postgres `date` columns. Prisma reads and writes them as
// UTC midnight, so convert through UTC to keep the calendar day intact.

export function dateFromDb(d: Date): DateKey {
  return d.toISOString().slice(0, 10);
}

export function dateToDb(key: DateKey): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

/** Loads everything the app shows from the user's own database. */
export async function loadSnapshot(db: UserDb): Promise<Snapshot> {
  const [cats, expenses, settings] = await Promise.all([
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
      },
    }),
    db.settings.findUnique({ where: { id: 1 } }),
  ]);

  return {
    cats,
    txns: expenses.map((e) => ({
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
    })),
    settings: {
      autoBills: settings?.autoCategorizeBills ?? true,
      weekly: settings?.weeklyReminder ?? true,
      big: settings?.bigPurchaseAlert ?? false,
    },
    widgets: isWidgetList(settings?.widgets) ? settings.widgets : [],
  };
}
