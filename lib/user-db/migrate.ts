import "server-only";

import { Pool } from "@neondatabase/serverless";

import "@/lib/neon-config";

import { USER_DB_MIGRATIONS } from "./migrations";

/** The newest migration this build knows about. */
export const LATEST_USER_DB_MIGRATION = USER_DB_MIGRATIONS.at(-1)!.name;

/**
 * Brings a workspace database up to date: applies every migration it hasn't
 * seen yet, in order, in one transaction. An advisory lock stops two
 * requests (or two deploys) from migrating the same database at once.
 * Returns the name of the newest migration now applied.
 */
export async function migrateUserDb(connectionString: string) {
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('guava.user-db.migrations'))",
    );
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_guava_migrations" (
        "name" TEXT PRIMARY KEY,
        "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const { rows } = await client.query<{ name: string }>(
      'SELECT "name" FROM "_guava_migrations"',
    );
    const applied = new Set(rows.map((r) => r.name));
    for (const { name, migration } of USER_DB_MIGRATIONS) {
      if (applied.has(name)) continue;
      if (typeof migration === "string") await client.query(migration);
      else await migration.up(client);
      await client.query(
        'INSERT INTO "_guava_migrations" ("name") VALUES ($1)',
        [name],
      );
    }
    await client.query("COMMIT");
    return LATEST_USER_DB_MIGRATION;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
