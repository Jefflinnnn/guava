// Hand-written code migration: the categories a new workspace starts with.
// Runs once per database, in the runner's transaction, and only if the
// database has no categories yet (a database that already holds guava data
// keeps its own). Don't edit after it ships; change DEFAULT_CATEGORIES for
// future databases with a new migration if needed.
import { randomUUID } from "node:crypto";

import { DEFAULT_CATEGORIES } from "@/lib/guava/default-categories";

import type { UserDbMigration } from "./types";

const migration: UserDbMigration = {
  async up(client) {
    const { rows } = await client.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM "Category"',
    );
    if (rows[0].n > 0) return;

    for (const [i, cat] of DEFAULT_CATEGORIES.entries()) {
      const categoryId = randomUUID();
      await client.query(
        `INSERT INTO "Category" ("id", "name", "color", "budgetCents", "locked", "sortOrder", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, now())`,
        [categoryId, cat.name, cat.color, cat.budgetCents, cat.locked, i],
      );
      for (const [j, sub] of cat.subs.entries()) {
        await client.query(
          `INSERT INTO "Subcategory" ("id", "categoryId", "name", "budgetCents", "sortOrder", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, now())`,
          [randomUUID(), categoryId, sub.name, sub.budgetCents, j],
        );
      }
    }
  },
};

export default migration;
