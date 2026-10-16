// Loads sample data for the demo user: the default categories and about
// three years of expenses ending today. Run with `pnpm db:seed`.
// Re-running replaces the demo user's categories, expenses and settings;
// bank connections are left alone.

import "dotenv/config";

import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

import { PrismaClient } from "../generated/prisma/client";
import { DEMO_USER } from "../lib/demo-user";
import { addDays, fromKey, toKey } from "../lib/guava/dates";
import { defaultCategoriesCreate } from "../lib/guava/default-categories";

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DIRECT_URL or DATABASE_URL.");
const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
});

/** [merchant, min $, max $, subcategory] by category. */
type Merchant = [name: string, min: number, max: number, sub: string];

const MERCHANTS: Record<string, Merchant[]> = {
  Food: [
    ["Trader Joe's", 18, 75, "Groceries"],
    ["Chipotle", 11, 18, "Dining out"],
    ["Blue Bottle Coffee", 5, 9, "Coffee"],
    ["Whole Foods", 25, 110, "Groceries"],
    ["DoorDash", 22, 48, "Dining out"],
    ["Waffle House", 9, 16, "Dining out"],
  ],
  Shopping: [
    ["Amazon", 12, 90, "Online"],
    ["Target", 15, 80, "Home"],
    ["Uniqlo", 30, 120, "Clothing"],
  ],
  Transport: [
    ["Uber", 9, 34, "Rideshare"],
    ["Shell", 35, 58, "Gas"],
    ["MARTA", 2.5, 2.5, "Transit"],
  ],
  Entertainment: [
    ["AMC Theatres", 14, 28, "Movies"],
    ["Steam", 10, 60, "Games"],
  ],
  Other: [
    ["CVS Pharmacy", 6, 40, "Health"],
    ["USPS", 5, 18, "Shipping"],
  ],
};

/** Share of everyday purchases per category (the rest falls to Other). */
const CATEGORY_WEIGHTS: [string, number][] = [
  ["Food", 0.5],
  ["Transport", 0.2],
  ["Shopping", 0.14],
  ["Entertainment", 0.07],
  ["Other", 0.09],
];

/** Monthly bills: [day of month, merchant, category, subcategory, $ or [min, max]]. */
const BILLS: [number, string, string, string, number | [number, number]][] = [
  [1, "Spotify", "Entertainment", "Streaming", 11.99],
  [5, "Georgia Power", "Bills", "Electricity", [85, 145]],
  [12, "Netflix", "Entertainment", "Streaming", 15.49],
  [15, "Xfinity", "Bills", "Internet", 79.99],
  [20, "Verizon", "Bills", "Phone", 65],
];

const BIG_PURCHASES: [string, string, string][] = [
  ["Best Buy", "Shopping", "Electronics"],
  ["IKEA", "Shopping", "Home"],
  ["Delta Air Lines", "Transport", "Flights"],
];

/** Expenses from the last few days start in "Needs review". */
const REVIEW_DAYS = 5;

/** mulberry32: a small seeded PRNG, so every run generates the same spending pattern. */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type SampleExpense = {
  date: string;
  name: string;
  category: string;
  sub: string;
  amountCents: number;
};

/** Everyday spending, bills and the odd big purchase from Jan 1 two years ago through today. */
function generateExpenses(today: string): SampleExpense[] {
  const rnd = seededRandom(20261004);
  const out: SampleExpense[] = [];
  const start = `${Number(today.slice(0, 4)) - 2}-01-01`;

  for (let date = start; date <= today; date = addDays(date, 1)) {
    const d = fromKey(date);
    const add = (
      name: string,
      category: string,
      sub: string,
      dollars: number,
    ) =>
      out.push({
        date,
        name,
        category,
        sub,
        amountCents: Math.round(dollars * 100),
      });

    for (const [day, name, category, sub, amount] of BILLS)
      if (d.getDate() === day)
        add(
          name,
          category,
          sub,
          Array.isArray(amount)
            ? amount[0] + rnd() * (amount[1] - amount[0])
            : amount,
        );

    const r = rnd();
    let n = r < 0.2 ? 0 : r < 0.55 ? 1 : r < 0.85 ? 2 : 3;
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    if (weekend && rnd() < 0.45) n++;
    for (let i = 0; i < n; i++) {
      let x = rnd();
      let category = "Other";
      for (const [c, w] of CATEGORY_WEIGHTS) {
        if (x < w) {
          category = c;
          break;
        }
        x -= w;
      }
      const list = MERCHANTS[category];
      const [name, min, max, sub] = list[Math.floor(rnd() * list.length)];
      add(name, category, sub, min + rnd() * (max - min));
    }

    if (rnd() < 0.025) {
      const [name, category, sub] = BIG_PURCHASES[Math.floor(rnd() * 3)];
      add(name, category, sub, 160 + rnd() * 380);
    }
  }
  return out;
}

async function main() {
  const today = toKey(new Date());
  const reviewFrom = addDays(today, -(REVIEW_DAYS - 1));

  const user = await prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: { name: DEMO_USER.name },
    create: { email: DEMO_USER.email, name: DEMO_USER.name },
  });

  await prisma.$transaction(async (tx) => {
    // Expenses first: categories can't be deleted while expenses use them.
    await tx.expense.deleteMany({ where: { userId: user.id } });
    await tx.category.deleteMany({ where: { userId: user.id } });
    await tx.userSettings.deleteMany({ where: { userId: user.id } });

    for (const data of defaultCategoriesCreate())
      await tx.category.create({ data: { ...data, userId: user.id } });
    await tx.userSettings.create({ data: { userId: user.id } });
  });

  const cats = await prisma.category.findMany({
    where: { userId: user.id },
    include: { subs: true },
  });
  const ids = new Map<string, { id: string; subs: Map<string, string> }>(
    cats.map((c) => [
      c.name,
      { id: c.id, subs: new Map(c.subs.map((s) => [s.name, s.id])) },
    ]),
  );

  const expenses = generateExpenses(today).map((e) => {
    const cat = ids.get(e.category);
    const subId = cat?.subs.get(e.sub);
    if (!cat || !subId) throw new Error(`Unknown ${e.category} › ${e.sub}`);
    return {
      userId: user.id,
      date: new Date(`${e.date}T00:00:00.000Z`),
      name: e.name,
      amountCents: e.amountCents,
      categoryId: cat.id,
      subcategoryId: subId,
      needsReview: e.date >= reviewFrom,
    };
  });

  const BATCH = 1000;
  for (let i = 0; i < expenses.length; i += BATCH)
    await prisma.expense.createMany({ data: expenses.slice(i, i + BATCH) });

  const review = expenses.filter((e) => e.needsReview).length;
  console.log(
    `Seeded ${DEMO_USER.email}: ${cats.length} categories, ` +
      `${expenses.length} expenses (${review} to review), through ${today}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
