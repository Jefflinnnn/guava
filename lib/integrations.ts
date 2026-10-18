import "server-only";

import { neon, NeonDbError } from "@neondatabase/serverless";
import { Configuration, PlaidApi, PlaidEnvironments, Products } from "plaid";

import { plaidCountryCodes } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";
import {
  isPlaidEnv,
  NEON_SSL_ERROR,
  neonRegionOf,
  neonUrlError,
  neonUrlHasSsl,
  plaidClientIdError,
  plaidDetail,
  plaidSecretError,
  type NeonDetails,
  type PlaidEnv,
} from "@/lib/integrations-validation";

// A test that hangs is a failed test; don't hold the form for longer than this.
const TEST_TIMEOUT_MS = 10_000;

export type { NeonDetails };

export type TestResult =
  { ok: true; detail: string } | { ok: false; error: string };

export type PlaidKeys = { env: PlaidEnv; clientId: string; secret: string };

/** What the browser may know about saved keys. Never includes secrets. */
export type SavedIntegrations = {
  plaid: { env: PlaidEnv; clientId: string } | null;
  neon: NeonDetails | null;
};

/** Plaid's error_code from a failed API call, e.g. "INVALID_API_KEYS". */
function plaidErrorCode(error: unknown): string | undefined {
  const data = (error as { response?: { data?: { error_code?: unknown } } })
    ?.response?.data;
  return typeof data?.error_code === "string" ? data.error_code : undefined;
}

/**
 * Checks Plaid keys by creating a link token for the Transactions product,
 * the same call the app makes before opening Plaid Link.
 */
export async function testPlaidKeys(
  keys: PlaidKeys,
  userId: string,
): Promise<TestResult> {
  if (
    !isPlaidEnv(keys.env) ||
    plaidClientIdError(keys.clientId) ||
    plaidSecretError(keys.secret)
  ) {
    return { ok: false, error: "Check the highlighted fields and try again." };
  }

  const plaid = new PlaidApi(
    new Configuration({
      basePath: PlaidEnvironments[keys.env],
      baseOptions: {
        timeout: TEST_TIMEOUT_MS,
        headers: {
          "PLAID-CLIENT-ID": keys.clientId,
          "PLAID-SECRET": keys.secret,
        },
      },
    }),
  );

  try {
    await plaid.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: "guava",
      products: [Products.Transactions],
      country_codes: plaidCountryCodes(),
      language: "en",
    });
    return { ok: true, detail: plaidDetail(keys.env) };
  } catch (error) {
    const code = plaidErrorCode(error);
    if (code === "INVALID_API_KEYS") {
      return {
        ok: false,
        error:
          "Plaid rejected these keys. Check that the secret matches the selected environment.",
      };
    }
    if (code === "INVALID_PRODUCT" || code === "PRODUCTS_NOT_SUPPORTED") {
      return {
        ok: false,
        error:
          "These keys don’t have the Transactions product enabled. Turn it on in the Plaid Dashboard.",
      };
    }
    console.error("Plaid key test failed", code ?? error);
    return {
      ok: false,
      error: "Couldn’t reach Plaid. Try again in a moment.",
    };
  }
}

/** Connects to the Neon database and reads its name and Postgres version. */
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

/** The user's saved integrations, minus anything secret. */
export async function loadSavedIntegrations(
  userId: string,
): Promise<SavedIntegrations> {
  const row = await prisma.integrationKeys.findUnique({ where: { userId } });
  return {
    plaid:
      row?.plaidVerifiedAt && row.plaidClientId && isPlaidEnv(row.plaidEnv)
        ? { env: row.plaidEnv, clientId: row.plaidClientId }
        : null,
    neon:
      row?.neonVerifiedAt && row.neonDatabase && row.neonPgVersion
        ? {
            database: row.neonDatabase,
            region: row.neonRegion ?? "neon",
            pgVersion: row.neonPgVersion,
          }
        : null,
  };
}
