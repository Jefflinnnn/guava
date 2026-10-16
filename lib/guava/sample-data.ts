import { addDays, toKey } from "./dates";
import type { Cat, Txn } from "./types";

// Sample data ported from the design prototype: a seeded, deterministic run of
// transactions from Jan 1 2024 to Oct 4 2026. Replace with real (Plaid) data.

export const SAMPLE_USER = {
  name: "Buzz P.",
  email: "buzz@gatech.edu",
  initials: "BP",
};

/** Preset category colors, in picker order (first 5 are also the defaults). */
export const CATEGORY_COLORS = [
  "oklch(0.646 0.222 41.116)",
  "oklch(0.6 0.118 184.704)",
  "oklch(0.398 0.07 227.392)",
  "oklch(0.828 0.189 84.429)",
  "oklch(0.769 0.188 70.08)",
  "oklch(0.6 0.2 300)",
  "oklch(0.6 0.2 15)",
];

export const SAMPLE_CATEGORIES: Cat[] = [
  {
    id: "food",
    name: "Food",
    color: "oklch(0.646 0.222 41.116)",
    budgetCents: 500_00,
    locked: false,
    subs: [
      { id: "groceries", name: "Groceries", budgetCents: 250_00 },
      { id: "dining", name: "Dining out", budgetCents: 180_00 },
      { id: "coffee", name: "Coffee", budgetCents: 40_00 },
    ],
  },
  {
    id: "transport",
    name: "Transport",
    color: "oklch(0.6 0.118 184.704)",
    budgetCents: 200_00,
    locked: false,
    subs: [
      { id: "rideshare", name: "Rideshare", budgetCents: 60_00 },
      { id: "gas", name: "Gas", budgetCents: 100_00 },
      { id: "transit", name: "Transit", budgetCents: 20_00 },
      { id: "flights", name: "Flights", budgetCents: 0 },
    ],
  },
  {
    id: "shopping",
    name: "Shopping",
    color: "oklch(0.398 0.07 227.392)",
    budgetCents: 300_00,
    locked: false,
    subs: [
      { id: "online", name: "Online", budgetCents: 120_00 },
      { id: "clothing", name: "Clothing", budgetCents: 80_00 },
      { id: "home", name: "Home", budgetCents: 60_00 },
      { id: "electronics", name: "Electronics", budgetCents: 40_00 },
    ],
  },
  {
    id: "bills",
    name: "Bills",
    color: "oklch(0.828 0.189 84.429)",
    budgetCents: 300_00,
    locked: true,
    subs: [
      { id: "electricity", name: "Electricity", budgetCents: 120_00 },
      { id: "internet", name: "Internet", budgetCents: 80_00 },
      { id: "phone", name: "Phone", budgetCents: 65_00 },
    ],
  },
  {
    id: "fun",
    name: "Entertainment",
    color: "oklch(0.769 0.188 70.08)",
    budgetCents: 120_00,
    locked: false,
    subs: [
      { id: "streaming", name: "Streaming", budgetCents: 30_00 },
      { id: "movies", name: "Movies", budgetCents: 40_00 },
      { id: "games", name: "Games", budgetCents: 40_00 },
    ],
  },
  {
    id: "other",
    name: "Other",
    color: "oklch(0.705 0.015 286.067)",
    budgetCents: 100_00,
    locked: false,
    subs: [
      { id: "health", name: "Health", budgetCents: 60_00 },
      { id: "shipping", name: "Shipping", budgetCents: 20_00 },
    ],
  },
];

type Merchant = [name: string, min: number, max: number, sub: string];

const MERCHANTS: Record<string, Merchant[]> = {
  food: [
    ["Trader Joe's", 18, 75, "groceries"],
    ["Chipotle", 11, 18, "dining"],
    ["Blue Bottle Coffee", 5, 9, "coffee"],
    ["Whole Foods", 25, 110, "groceries"],
    ["DoorDash", 22, 48, "dining"],
    ["Waffle House", 9, 16, "dining"],
  ],
  shopping: [
    ["Amazon", 12, 90, "online"],
    ["Target", 15, 80, "home"],
    ["Uniqlo", 30, 120, "clothing"],
  ],
  transport: [
    ["Uber", 9, 34, "rideshare"],
    ["Shell", 35, 58, "gas"],
    ["MARTA", 2.5, 2.5, "transit"],
  ],
  fun: [
    ["AMC Theatres", 14, 28, "movies"],
    ["Steam", 10, 60, "games"],
  ],
  other: [
    ["CVS Pharmacy", 6, 40, "health"],
    ["USPS", 5, 18, "shipping"],
  ],
};

const CATEGORY_WEIGHTS: [string, number][] = [
  ["food", 0.5],
  ["transport", 0.2],
  ["shopping", 0.14],
  ["fun", 0.07],
  ["other", 0.09],
];

const BIG_PURCHASES: [string, string, string][] = [
  ["Best Buy", "shopping", "electronics"],
  ["IKEA", "shopping", "home"],
  ["Delta Air Lines", "transport", "flights"],
];

/** mulberry32 */
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

/** Newest first. Everything from Sep 30 2026 on starts in "Needs review". */
export function generateSampleTxns(): Txn[] {
  const rnd = seededRandom(20261004);
  const txns: Txn[] = [];
  let id = 1;
  const end = "2026-10-04";

  for (let day = "2024-01-01"; day <= end; day = addDays(day, 1)) {
    const d = new Date(
      Number(day.slice(0, 4)),
      Number(day.slice(5, 7)) - 1,
      Number(day.slice(8)),
      12,
    );
    const dow = d.getDay();
    const dom = d.getDate();
    const date = toKey(d);
    const add = (name: string, catId: string, amount: number, subId: string) =>
      txns.push({
        id: id++,
        date,
        name,
        catId,
        subId,
        amountCents: Math.round(amount * 100),
        needsReview: date >= "2026-09-30",
        note: "",
      });

    if (dom === 5)
      add("Georgia Power", "bills", 85 + rnd() * 60, "electricity");
    if (dom === 15) add("Xfinity", "bills", 79.99, "internet");
    if (dom === 20) add("Verizon", "bills", 65, "phone");
    if (dom === 1) add("Spotify", "fun", 11.99, "streaming");
    if (dom === 12) add("Netflix", "fun", 15.49, "streaming");

    const r = rnd();
    let n = r < 0.2 ? 0 : r < 0.55 ? 1 : r < 0.85 ? 2 : 3;
    if ((dow === 0 || dow === 6) && rnd() < 0.45) n++;
    for (let i = 0; i < n; i++) {
      let x = rnd();
      let catId = "other";
      for (const [c, w] of CATEGORY_WEIGHTS) {
        if (x < w) {
          catId = c;
          break;
        }
        x -= w;
      }
      const list = MERCHANTS[catId];
      const [name, min, max, sub] = list[Math.floor(rnd() * list.length)];
      add(name, catId, min + rnd() * (max - min), sub);
    }
    if (rnd() < 0.025) {
      const [name, catId, sub] = BIG_PURCHASES[Math.floor(rnd() * 3)];
      add(name, catId, 160 + rnd() * 380, sub);
    }
  }
  return txns.reverse();
}
