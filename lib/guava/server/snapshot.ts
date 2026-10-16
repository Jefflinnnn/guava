import "server-only";

import { prisma } from "@/lib/prisma";

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

/** Loads everything the app shows for one user. */
export async function loadSnapshot(userId: string): Promise<Snapshot> {
  const [user, cats, expenses, settings] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    prisma.category.findMany({
      where: { userId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        color: true,
        budgetCents: true,
        locked: true,
        subs: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: { id: true, name: true, budgetCents: true },
        },
      },
    }),
    prisma.expense.findMany({
      where: { userId },
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
      },
    }),
    prisma.userSettings.findUnique({ where: { userId } }),
  ]);

  return {
    user: { name: user.name ?? user.email, email: user.email },
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
    })),
    settings: {
      autoBills: settings?.autoCategorizeBills ?? true,
      weekly: settings?.weeklyReminder ?? true,
      big: settings?.bigPurchaseAlert ?? false,
    },
    widgets: isWidgetList(settings?.widgets) ? settings.widgets : [],
  };
}
