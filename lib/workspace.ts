import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { neon, NeonDbError } from "@neondatabase/serverless";

import { decrypt } from "@/lib/crypto";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { userDbClient, type UserDb } from "@/lib/user-db/client";
import { LATEST_USER_DB_MIGRATION, migrateUserDb } from "@/lib/user-db/migrate";
import {
  NEON_SSL_ERROR,
  neonRegionOf,
  neonUrlError,
  neonUrlHasSsl,
  type NeonDetails,
} from "@/lib/workspace-validation";

// A test that hangs is a failed test; don't hold the form for longer than this.
const TEST_TIMEOUT_MS = 10_000;

/**
 * Connects to a Neon database and reads its name and Postgres version.
 * Read-only: it doesn't create anything.
 */
export async function testNeonUrl(
  url: string,
): Promise<{ ok: true; details: NeonDetails } | { ok: false; error: string }> {
  if (neonUrlError(url)) {
    return { ok: false, error: "Check the connection string and try again." };
  }
  if (!neonUrlHasSsl(url)) return { ok: false, error: NEON_SSL_ERROR };

  // The format check above pins the host to *.neon.tech; check the parsed URL
  // too, so nothing else is ever dialed from the server.
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return { ok: false, error: "Check the connection string and try again." };
  }
  if (!host.endsWith(".neon.tech")) {
    return {
      ok: false,
      error: "That isn’t a Neon host — it should end in .neon.tech.",
    };
  }

  try {
    const sql = neon(url, {
      fetchOptions: { signal: AbortSignal.timeout(TEST_TIMEOUT_MS) },
    });
    const [row] = (await sql`
      select current_database() as database,
             current_setting('server_version_num')::int as version
    `) as { database: string; version: number }[];
    return {
      ok: true,
      details: {
        database: row.database,
        region: neonRegionOf(url),
        pgVersion: Math.floor(row.version / 10000),
      },
    };
  } catch (error) {
    const code = error instanceof NeonDbError ? error.code : undefined;
    if (code === "28P01" || code === "28000") {
      return {
        ok: false,
        error: "Neon rejected the user or password in this string.",
      };
    }
    if (code === "3D000") {
      return {
        ok: false,
        error: "That database doesn’t exist on this Neon project.",
      };
    }
    console.error("Neon connection test failed", code ?? error);
    return {
      ok: false,
      error: "Couldn’t connect to Neon. Check the string and try again.",
    };
  }
}

/** The user's workspace row, or null. Cached per request. */
export const getWorkspace = cache((userId: string) =>
  prisma.workspace.findUnique({ where: { userId } }),
);

/** What the browser may know about a workspace. Never the connection string. */
export async function getWorkspaceDetails(
  userId: string,
): Promise<NeonDetails | null> {
  const workspace = await getWorkspace(userId);
  return workspace
    ? {
        database: workspace.database,
        region: workspace.region,
        pgVersion: workspace.pgVersion,
      }
    : null;
}

/**
 * The signed-in user and their workspace. Redirects to /login without a
 * session and to /connect without a workspace. If this build has workspace
 * migrations the database hasn't seen (a new deploy), applies them first.
 * Cached per request.
 */
export const requireWorkspace = cache(async () => {
  const user = await requireUser();
  let workspace = await getWorkspace(user.id);
  if (!workspace) redirect("/connect");

  if (workspace.schemaVersion !== LATEST_USER_DB_MIGRATION) {
    const schemaVersion = await migrateUserDb(decrypt(workspace.neonUrl));
    workspace = await prisma.workspace.update({
      where: { userId: user.id },
      data: { schemaVersion },
    });
  }
  return { user, workspace };
});

/** A Prisma client for the signed-in user's own database. */
export async function getUserDb(): Promise<UserDb> {
  const { workspace } = await requireWorkspace();
  return userDbClient(decrypt(workspace.neonUrl));
}
