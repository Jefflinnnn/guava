"use server";

import type { UserDb } from "@/lib/user-db/client";
import { getUserDb } from "@/lib/workspace";

import { isCategoryColor } from "../colors";
import { isDateKey } from "../dates";
import { EXPENSE_CAP_CENTS } from "../money-input";
import type { DateKey, Settings, Snapshot, Widget } from "../types";
import { isWidgetList } from "../widgets";
import { dateToDb, loadSnapshot } from "./snapshot";

// Mutations behind the client store (lib/guava/store.tsx). The store applies
// each change optimistically, then calls one of these to persist it. Every
// action re-checks its input, because server actions can be called directly
// with any payload, and runs against the signed-in user's own database
// (getUserDb), so there's no other user's data to reach.

export async function getSnapshot(): Promise<Snapshot> {
  return loadSnapshot(await getUserDb());
}

// ---- Validation

function fail(message: string): never {
  throw new Error(message);
}

/** Ids are minted by the client (crypto.randomUUID) or by Prisma (cuid). */
function id(v: unknown): string {
  return typeof v === "string" && /^[\w-]{1,40}$/.test(v)
    ? v
    : fail("Invalid id.");
}

function text(v: unknown, max: number, field: string): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s || s.length > max) fail(`Invalid ${field}.`);
  return s;
}

function cents(v: unknown, min: number, max: number): number {
  return Number.isInteger(v) && (v as number) >= min && (v as number) <= max
    ? (v as number)
    : fail("Invalid amount.");
}

/** An expense amount: positive for spending, negative for a refund. */
function expenseCents(v: unknown): number {
  const c = cents(v, -EXPENSE_CAP_CENTS, EXPENSE_CAP_CENTS);
  return c === 0 ? fail("Invalid amount.") : c;
}

function bool(v: unknown): boolean {
  return typeof v === "boolean" ? v : fail("Invalid flag.");
}

// ---- Expenses

export type ExpenseInput = {
  date: DateKey;
  name: string;
  amountCents: number;
  /** null = uncategorized. */
  catId: string | null;
  subId: string | null;
  needsReview: boolean;
  note: string;
  spending: boolean;
};

/**
 * Validates an expense and checks its category (and subcategory) exist. An
 * uncategorized expense has no subcategory and needs review, unless it isn't
 * spending (see lib/guava/spending.ts).
 */
async function expenseData(db: UserDb, input: ExpenseInput) {
  const date = isDateKey(input?.date) ? input.date : fail("Invalid date.");
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (note.length > 200) fail("Invalid note.");
  const spending = bool(input.spending);
  const categoryId = input.catId == null ? null : id(input.catId);
  const subcategoryId = input.subId == null ? null : id(input.subId);
  if (categoryId) {
    const cat = await db.category.findUnique({
      where: { id: categoryId },
      select: { subs: { select: { id: true } } },
    });
    if (!cat) fail("Category not found.");
    if (subcategoryId && !cat.subs.some((s) => s.id === subcategoryId))
      fail("Subcategory not found.");
  } else if (subcategoryId) {
    fail("Subcategory needs a category.");
  }
  return {
    date: dateToDb(date),
    name: text(input.name, 40, "name"),
    amountCents: expenseCents(input.amountCents),
    categoryId,
    subcategoryId,
    needsReview: bool(input.needsReview) || (!categoryId && spending),
    note,
    spending,
  };
}

export async function createExpense(expenseId: string, input: ExpenseInput) {
  const db = await getUserDb();
  await db.expense.create({
    data: { id: id(expenseId), ...(await expenseData(db, input)) },
  });
}

export async function updateExpense(expenseId: string, input: ExpenseInput) {
  const db = await getUserDb();
  const { count } = await db.expense.updateMany({
    where: { id: id(expenseId) },
    data: await expenseData(db, input),
  });
  if (!count) fail("Expense not found.");
}

export async function deleteExpense(expenseId: string) {
  const db = await getUserDb();
  await db.expense.deleteMany({ where: { id: id(expenseId) } });
}

export async function setExpensesReview(ids: string[], needsReview: boolean) {
  const db = await getUserDb();
  if (!Array.isArray(ids) || ids.length > 10_000) fail("Invalid ids.");
  // Uncategorized spending stays in review until it gets a category.
  await db.expense.updateMany({
    where: {
      id: { in: ids.map(id) },
      ...(bool(needsReview)
        ? {}
        : { OR: [{ categoryId: { not: null } }, { spending: false }] }),
    },
    data: { needsReview },
  });
}

// ---- Categories

export type CategoryInput = {
  name: string;
  color: string;
  locked: boolean;
};

function categoryData(input: CategoryInput) {
  return {
    name: text(input?.name, 24, "name"),
    color: isCategoryColor(input.color) ? input.color : fail("Invalid color."),
    locked: bool(input.locked),
  };
}

export async function createCategory(categoryId: string, input: CategoryInput) {
  const db = await getUserDb();
  const data = categoryData(input);
  const last = await db.category.aggregate({ _max: { sortOrder: true } });
  await db.category.create({
    data: {
      id: id(categoryId),
      sortOrder: (last._max.sortOrder ?? -1) + 1,
      ...data,
    },
  });
}

export async function updateCategory(categoryId: string, input: CategoryInput) {
  const db = await getUserDb();
  const data = categoryData(input);
  const cat = await db.category.findUnique({
    where: { id: id(categoryId) },
    select: { locked: true },
  });
  if (!cat) fail("Category not found.");
  // A locked category only accepts being unlocked.
  if (cat.locked && data.locked) fail("Category is locked.");
  await db.category.update({ where: { id: categoryId }, data });
}

/**
 * Deletes a category and its subcategories. Its expenses move to `moveTo`
 * (losing their subcategory); without `moveTo` they become uncategorized and
 * go back to review.
 */
export async function deleteCategory(
  categoryId: string,
  moveTo: string | null,
) {
  const db = await getUserDb();
  await db.$transaction(async (tx) => {
    const cat = await tx.category.findUnique({
      where: { id: id(categoryId) },
      select: { locked: true },
    });
    if (!cat) return;
    if (cat.locked) fail("Category is locked.");
    if (moveTo != null) {
      const target = await tx.category.findFirst({
        where: { id: id(moveTo), NOT: { id: categoryId } },
        select: { id: true },
      });
      if (!target) fail("Category not found.");
      await tx.expense.updateMany({
        where: { categoryId },
        data: { categoryId: target.id, subcategoryId: null },
      });
    } else {
      await tx.expense.updateMany({
        where: { categoryId },
        data: { categoryId: null, subcategoryId: null, needsReview: true },
      });
    }
    await tx.category.delete({ where: { id: categoryId } });
  });
}

// ---- Subcategories

export type SubcategoryInput = { name: string };

function subcategoryData(input: SubcategoryInput) {
  return { name: text(input?.name, 24, "name") };
}

async function assertCategory(db: UserDb, categoryId: string) {
  const cat = await db.category.findUnique({
    where: { id: id(categoryId) },
    select: { id: true },
  });
  if (!cat) fail("Category not found.");
}

export async function createSubcategory(
  categoryId: string,
  subcategoryId: string,
  input: SubcategoryInput,
) {
  const db = await getUserDb();
  const data = subcategoryData(input);
  await assertCategory(db, categoryId);
  const last = await db.subcategory.aggregate({
    where: { categoryId },
    _max: { sortOrder: true },
  });
  await db.subcategory.create({
    data: {
      id: id(subcategoryId),
      categoryId,
      sortOrder: (last._max.sortOrder ?? -1) + 1,
      ...data,
    },
  });
}

export async function updateSubcategory(
  categoryId: string,
  subcategoryId: string,
  input: SubcategoryInput,
) {
  const db = await getUserDb();
  const data = subcategoryData(input);
  await assertCategory(db, categoryId);
  const { count } = await db.subcategory.updateMany({
    where: { id: id(subcategoryId), categoryId },
    data,
  });
  if (!count) fail("Subcategory not found.");
}

/** Deletes a subcategory; its expenses keep the category (FK sets null). */
export async function deleteSubcategory(
  categoryId: string,
  subcategoryId: string,
) {
  const db = await getUserDb();
  await assertCategory(db, categoryId);
  await db.subcategory.deleteMany({
    where: { id: id(subcategoryId), categoryId },
  });
}

// ---- Settings

const SETTING_COLUMNS = {
  autoBills: "autoCategorizeBills",
  weekly: "weeklyReminder",
  big: "bigPurchaseAlert",
} as const satisfies Record<keyof Settings, string>;

export async function setSetting(key: keyof Settings, value: boolean) {
  const db = await getUserDb();
  const column = Object.hasOwn(SETTING_COLUMNS, key)
    ? SETTING_COLUMNS[key]
    : fail("Unknown setting.");
  const data = { [column]: bool(value) };
  await db.settings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
}

export async function saveWidgets(widgets: Widget[]) {
  const db = await getUserDb();
  if (!isWidgetList(widgets)) fail("Invalid widgets.");
  const data = { widgets: widgets.map(({ id, size }) => ({ id, size })) };
  await db.settings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
}
