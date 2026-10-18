import { CATEGORY_COLORS, NEUTRAL_CATEGORY_COLOR } from "./colors";

export type DefaultCategory = {
  name: string;
  color: string;
  budgetCents: number;
  locked: boolean;
  subs: { name: string; budgetCents: number }[];
};

/** The categories every new account starts with. */
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    name: "Food",
    color: CATEGORY_COLORS[0],
    budgetCents: 500_00,
    locked: false,
    subs: [
      { name: "Groceries", budgetCents: 250_00 },
      { name: "Dining out", budgetCents: 180_00 },
      { name: "Coffee", budgetCents: 40_00 },
    ],
  },
  {
    name: "Transport",
    color: CATEGORY_COLORS[1],
    budgetCents: 200_00,
    locked: false,
    subs: [
      { name: "Rideshare", budgetCents: 60_00 },
      { name: "Gas", budgetCents: 100_00 },
      { name: "Transit", budgetCents: 20_00 },
      { name: "Flights", budgetCents: 0 },
    ],
  },
  {
    name: "Shopping",
    color: CATEGORY_COLORS[2],
    budgetCents: 300_00,
    locked: false,
    subs: [
      { name: "Online", budgetCents: 120_00 },
      { name: "Clothing", budgetCents: 80_00 },
      { name: "Home", budgetCents: 60_00 },
      { name: "Electronics", budgetCents: 40_00 },
    ],
  },
  {
    name: "Bills",
    color: CATEGORY_COLORS[3],
    budgetCents: 300_00,
    locked: true,
    subs: [
      { name: "Electricity", budgetCents: 120_00 },
      { name: "Internet", budgetCents: 80_00 },
      { name: "Phone", budgetCents: 65_00 },
    ],
  },
  {
    name: "Entertainment",
    color: CATEGORY_COLORS[4],
    budgetCents: 120_00,
    locked: false,
    subs: [
      { name: "Streaming", budgetCents: 30_00 },
      { name: "Movies", budgetCents: 40_00 },
      { name: "Games", budgetCents: 40_00 },
    ],
  },
  {
    name: "Other",
    color: NEUTRAL_CATEGORY_COLOR,
    budgetCents: 100_00,
    locked: false,
    subs: [
      { name: "Health", budgetCents: 60_00 },
      { name: "Shipping", budgetCents: 20_00 },
    ],
  },
];
