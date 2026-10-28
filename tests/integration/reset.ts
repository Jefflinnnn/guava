import { Pool } from "@neondatabase/serverless";

import "@/lib/neon-config";

/** Empties a workspace database, through the Neon driver like the app. */
export async function resetDatabase(url: string) {
  const pool = new Pool({ connectionString: url });
  try {
    await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
  } finally {
    await pool.end();
  }
}
