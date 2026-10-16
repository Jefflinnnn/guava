"use server";

import { getCurrentUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

import { isCategoryColor } from "../colors";
import { isDateKey } from "../dates";
import { BUDGET_CAP_CENTS, EXPENSE_CAP_CENTS } from "../money-input";
import type { DateKey, Settings, Snapshot, Widget } from "../types";
import { isWidgetList } from "../widgets";
import { dateToDb, loadSnapshot } from "./snapshot";

// Mutations behind the client store (lib/guava/store.tsx). The store applies
// each change optimistically, then calls one of these to persist it. Every
// action re-checks its input and scopes every query to the current user,
// because server actions can be called directly with any payload.

export async function getSnapshot(): Promise<Snapshot> {
  return loadSnapshot(await getCurrentUserId());
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

function bool(v: unknown): boolean {
  return typeof v === "boolean" ? v : fail("Invalid flag.");
}

// ---- Expenses

export type ExpenseInput = {
  date: DateKey;
  name: string;
  amountCents: number;
  catId: string;
  subId: string | null;
  needsReview: boolean;
  note: string;
};

/** Validates an expense and checks its category (and subcategory) are the user's. */
async function expenseData(userId: string, input: ExpenseInput) {
  const date = isDateKey(input?.date) ? input.date : fail("Invalid date.");
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (note.length > 200) fail("Invalid note.");
  const categoryId = id(input.catId);
  const subcategoryId = input.subId == null ? null : id(input.subId);
  const cat = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { subs: { select: { id: true } } },
  });
  if (!cat) fail("Category not found.");
  if (subcategoryId && !cat.subs.some((s) => s.id === subcategoryId))
    fail("Subcategory not found.");
  return {
    date: dateToDb(date),
    name: text(input.name, 40, "name"),
    amountCents: cents(input.amountCents, 1, EXPENSE_CAP_CENTS),
    categoryId,
    subcategoryId,
    needsReview: bool(input.needsReview),
    note,
  };
}

export async function createExpense(expenseId: string, input: ExpenseInput) {
  const userId = await getCurrentUserId();
  await prisma.expense.create({
    data: { id: id(expenseId), userId, ...(await expenseData(userId, input)) },
  });
}

export async function updateExpense(expenseId: string, input: ExpenseInput) {
  const userId = await getCurrentUserId();
  const { count } = await prisma.expense.updateMany({
    where: { id: id(expenseId), userId },
    data: await expenseData(userId, input),
  });
  if (!count) fail("Expense not found.");
}

export async function deleteExpense(expenseId: string) {
  const userId = await getCurrentUserId();
  await prisma.expense.deleteMany({ where: { id: id(expenseId), userId } });
}

export async function setExpensesReview(ids: string[], needsReview: boolean) {
  const userId = await getCurrentUserId();
  if (!Array.isArray(ids) || ids.length > 10_000) fail("Invalid ids.");
  await prisma.expense.updateMany({
    where: { id: { in: ids.map(id) }, userId },
    data: { needsReview: bool(needsReview) },
  });
}

// ---- Categories

export type CategoryInput = {
  name: string;
  color: string;
  budgetCents: number;
  locked: boolean;
};

function categoryData(input: CategoryInput) {
  return {
    name: text(input?.name, 24, "name"),
    color: isCategoryColor(input.color) ? input.color : fail("Invalid color."),
    budgetCents: cents(input.budgetCents, 0, BUDGET_CAP_CENTS),
    locked: bool(input.locked),
  };
}

export async function createCategory(categoryId: string, input: CategoryInput) {
  const userId = await getCurrentUserId();
  const data = categoryData(input);
  const last = await prisma.category.aggregate({
    where: { userId },
    _max: { sortOrder: true },
  });
  await prisma.category.create({
    data: {
      id: id(categoryId),
      userId,
      sortOrder: (last._max.sortOrder ?? -1) + 1,
      ...data,
    },
  });
}

export async function updateCategory(categoryId: string, input: CategoryInput) {
  const userId = await getCurrentUserId();
  const data = categoryData(input);
  const cat = await prisma.category.findFirst({
    where: { id: id(categoryId), userId },
    select: { locked: true },
  });
  if (!cat) fail("Category not found.");
  // A locked category only accepts being unlocked.
  if (cat.locked && data.locked) fail("Category is locked.");
  await prisma.category.update({ where: { id: categoryId }, data });
}

/**
 * Deletes a category and its subcategories. Its expenses move to `moveTo`
 * (losing their subcategory); without `moveTo`, the database refuses the
 * delete if any expenses still use the category.
 */
export async function deleteCategory(
  categoryId: string,
  moveTo: string | null,
) {
  const userId = await getCurrentUserId();
  await prisma.$transaction(async (tx) => {
    const cat = await tx.category.findFirst({
      where: { id: id(categoryId), userId },
      select: { locked: true },
    });
    if (!cat) return;
    if (cat.locked) fail("Category is locked.");
    if (moveTo != null) {
      const target = await tx.category.findFirst({
        where: { id: id(moveTo), userId, NOT: { id: categoryId } },
        select: { id: true },
      });
      if (!target) fail("Category not found.");
      await tx.expense.updateMany({
        where: { categoryId, userId },
        data: { categoryId: target.id, subcategoryId: null },
      });
    }
    await tx.category.delete({ where: { id: categoryId } });
  });
}

// ---- Subcategories

export type SubcategoryInput = { name: string; budgetCents: number };

function subcategoryData(input: SubcategoryInput) {
  return {
    name: text(input?.name, 24, "name"),
    budgetCents: cents(input.budgetCents, 0, BUDGET_CAP_CENTS),
  };
}

async function assertOwnCategory(userId: string, categoryId: string) {
  const cat = await prisma.category.findFirst({
    where: { id: id(categoryId), userId },
    select: { id: true },
  });
  if (!cat) fail("Category not found.");
}

export async function createSubcategory(
  categoryId: string,
  subcategoryId: string,
  input: SubcategoryInput,
) {
  const userId = await getCurrentUserId();
  const data = subcategoryData(input);
  await assertOwnCategory(userId, categoryId);
  const last = await prisma.subcategory.aggregate({
    where: { categoryId },
    _max: { sortOrder: true },
  });
  await prisma.subcategory.create({
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
  const userId = await getCurrentUserId();
  const data = subcategoryData(input);
  await assertOwnCategory(userId, categoryId);
  const { count } = await prisma.subcategory.updateMany({
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
  const userId = await getCurrentUserId();
  await assertOwnCategory(userId, categoryId);
  await prisma.subcategory.deleteMany({
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
  const userId = await getCurrentUserId();
  const column = Object.hasOwn(SETTING_COLUMNS, key)
    ? SETTING_COLUMNS[key]
    : fail("Unknown setting.");
  const data = { [column]: bool(value) };
  await prisma.userSettings.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

export async function saveWidgets(widgets: Widget[]) {
  const userId = await getCurrentUserId();
  if (!isWidgetList(widgets)) fail("Invalid widgets.");
  const data = { widgets: widgets.map(({ id, size }) => ({ id, size })) };
  await prisma.userSettings.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}
