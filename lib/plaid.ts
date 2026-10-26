import "server-only";

import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
} from "plaid";

import { decrypt } from "@/lib/crypto";
import {
  isPlaidEnv,
  type PlaidEnv,
  type PlaidKeyDetails,
} from "@/lib/plaid-validation";
import type { UserDb } from "@/lib/user-db/client";

// Plaid is bring-your-own-key: each user saves their own client ID and secret
// in their own database (the PlaidConfig row), and every Plaid call is made
// with them. The app itself has no Plaid keys.

export const PLAID_PRODUCTS = [Products.Transactions];
export const PLAID_COUNTRY_CODES = [CountryCode.Us];

export type PlaidKeys = { clientId: string; secret: string; env: PlaidEnv };

/** A Plaid client for one set of keys. */
export function plaidClient({ clientId, secret, env }: PlaidKeys): PlaidApi {
  return new PlaidApi(
    new Configuration({
      basePath: PlaidEnvironments[env],
      baseOptions: {
        headers: { "PLAID-CLIENT-ID": clientId, "PLAID-SECRET": secret },
      },
    }),
  );
}

/** Plaid's `error_code` from a failed call (the SDK throws Axios errors). */
export function plaidErrorCode(error: unknown): string | undefined {
  const data = (error as { response?: { data?: { error_code?: unknown } } })
    ?.response?.data;
  return typeof data?.error_code === "string" ? data.error_code : undefined;
}

/**
 * Logs a failed Plaid call without the error object itself: Axios errors
 * carry the request headers, which include the user's secret.
 */
export function logPlaidError(label: string, error: unknown) {
  console.error(
    label,
    plaidErrorCode(error) ??
      (error instanceof Error ? error.message : "unknown error"),
  );
}

/** The user's saved Plaid keys, decrypted, or null when there are none. */
export async function loadPlaidKeys(db: UserDb): Promise<PlaidKeys | null> {
  const row = await db.plaidConfig.findUnique({ where: { id: 1 } });
  if (!row || !isPlaidEnv(row.env)) return null;
  return { clientId: row.clientId, secret: decrypt(row.secret), env: row.env };
}

/** What the browser may see about the saved keys, or null. */
export async function loadPlaidKeyDetails(
  db: UserDb,
): Promise<PlaidKeyDetails | null> {
  const row = await db.plaidConfig.findUnique({
    where: { id: 1 },
    select: { clientId: true, env: true },
  });
  if (!row || !isPlaidEnv(row.env)) return null;
  return { env: row.env, clientIdEnd: row.clientId.slice(-4) };
}

/** Thrown when a Plaid feature is used before the user saved their keys. */
export class NoPlaidKeysError extends Error {
  constructor() {
    super("Add your Plaid keys on the Integrations page first.");
    this.name = "NoPlaidKeysError";
  }
}

/** A Plaid client with the user's own keys. Throws `NoPlaidKeysError`. */
export async function userPlaidClient(db: UserDb): Promise<PlaidApi> {
  const keys = await loadPlaidKeys(db);
  if (!keys) throw new NoPlaidKeysError();
  return plaidClient(keys);
}

/** A connected bank as the browser may see it. Never the access token. */
export type BankDetails = {
  id: string;
  institution: string;
  /** ISO time of the last successful sync, or null. */
  lastSyncedAt: string | null;
  /** The bank wants the user to sign in again before syncing. */
  loginRequired: boolean;
  /** Expenses imported from this bank's accounts. */
  expenseCount: number;
  accounts: {
    id: string;
    name: string;
    mask: string | null;
    subtype: string | null;
  }[];
};

/** The user's connected banks, newest first. */
export async function loadBanks(db: UserDb): Promise<BankDetails[]> {
  const items = await db.plaidItem.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      institutionName: true,
      lastSyncedAt: true,
      loginRequired: true,
      accounts: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          mask: true,
          subtype: true,
          _count: { select: { expenses: true } },
        },
      },
    },
  });
  return items.map((i) => ({
    id: i.id,
    institution: i.institutionName ?? "Bank",
    lastSyncedAt: i.lastSyncedAt?.toISOString() ?? null,
    loginRequired: i.loginRequired,
    expenseCount: i.accounts.reduce((n, a) => n + a._count.expenses, 0),
    accounts: i.accounts.map((a) => ({
      id: a.id,
      name: a.name,
      mask: a.mask,
      subtype: a.subtype,
    })),
  }));
}
