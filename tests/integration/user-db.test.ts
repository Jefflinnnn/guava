import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { userDbClient } from "@/lib/user-db/client";
import { LATEST_USER_DB_MIGRATION, migrateUserDb } from "@/lib/user-db/migrate";
import { USER_DB_MIGRATIONS } from "@/lib/user-db/migrations";

import { resetDatabase } from "./reset";

const url = process.env.WORKSPACE_URL_INTEGRATION!;
const pool = new Pool({ connectionString: url });

async function appliedMigrations(): Promise<string[]> {
  const { rows } = await pool.query<{ name: string }>(
    'SELECT "name" FROM "_guava_migrations" ORDER BY "name"',
  );
  return rows.map((r) => r.name);
}

beforeEach(() => resetDatabase(url));
afterAll(() => pool.end());

describe("migrateUserDb", () => {
  it("applies every migration to an empty database", async () => {
    expect(await migrateUserDb(url)).toBe(LATEST_USER_DB_MIGRATION);
    expect(await appliedMigrations()).toEqual(
      USER_DB_MIGRATIONS.map((m) => m.name),
    );
  });

  it("does nothing on a database that's up to date", async () => {
    await migrateUserDb(url);
    const before = await pool.query('SELECT * FROM "_guava_migrations"');
    expect(await migrateUserDb(url)).toBe(LATEST_USER_DB_MIGRATION);
    const after = await pool.query('SELECT * FROM "_guava_migrations"');
    expect(after.rows).toEqual(before.rows);
  });

  it("is safe to run twice at once", async () => {
    const results = await Promise.all([migrateUserDb(url), migrateUserDb(url)]);
    expect(results).toEqual([
      LATEST_USER_DB_MIGRATION,
      LATEST_USER_DB_MIGRATION,
    ]);
    expect(await appliedMigrations()).toHaveLength(USER_DB_MIGRATIONS.length);
  });
});

describe("userDbClient", () => {
  it("reads and writes the migrated schema", async () => {
    await migrateUserDb(url);
    const db = userDbClient(url);
    try {
      const created = await db.category.create({
        data: { name: "Integration", color: "#ff8800" },
      });
      const found = await db.category.findUnique({
        where: { name: "Integration" },
      });
      expect(found).toMatchObject({ id: created.id, color: "#ff8800" });
    } finally {
      await db.$disconnect();
    }
  });
});
