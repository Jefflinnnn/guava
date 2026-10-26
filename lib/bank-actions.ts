"use server";

import type { AccountBase } from "plaid";

import { getCurrentUserId } from "@/lib/current-user";
import { decrypt, encrypt } from "@/lib/crypto";
import {
  logPlaidError,
  NoPlaidKeysError,
  PLAID_COUNTRY_CODES,
  PLAID_PRODUCTS,
  plaidErrorCode,
  userPlaidClient,
} from "@/lib/plaid";
import { syncItem, type SyncCounts } from "@/lib/plaid-sync";
import type { UserDb } from "@/lib/user-db/client";
import { getUserDb } from "@/lib/workspace";

// Bank connections through Plaid, made with the user's own keys and stored in
// their own database. See lib/plaid-sync.ts for how transactions are applied.

export type BankResult<T> = ({ ok: true } & T) | { ok: false; error: string };

function failure(label: string, error: unknown): { ok: false; error: string } {
  if (error instanceof NoPlaidKeysError) {
    return { ok: false, error: error.message };
  }
  if (plaidErrorCode(error) === "ITEM_LOGIN_REQUIRED") {
    return {
      ok: false,
      error:
        "Your bank needs you to sign in again. Reconnect it to keep syncing.",
    };
  }
  logPlaidError(label, error);
  return { ok: false, error: "Plaid didn’t respond. Try again." };
}

/** A saved bank connection's id (a cuid), as sent from the browser. */
function itemId(v: unknown): string {
  if (typeof v !== "string" || !/^[a-z0-9]{1,40}$/i.test(v)) {
    throw new Error("Invalid bank id.");
  }
  return v;
}

/**
 * Step 1 of Plaid Link: a short-lived token that opens the Link modal. With
 * a saved bank's id it opens Link's update mode instead, where the user signs
 * in to that bank again and keeps the same connection.
 */
export async function createLinkToken(
  reconnectId?: unknown,
): Promise<BankResult<{ linkToken: string }>> {
  try {
    const userId = await getCurrentUserId();
    const db = await getUserDb();
    const plaid = await userPlaidClient(db);
    const update =
      reconnectId === undefined
        ? null
        : await db.plaidItem.findUnique({
            where: { id: itemId(reconnectId) },
            select: { accessToken: true },
          });
    if (reconnectId !== undefined && !update) {
      return { ok: false, error: "That bank isn’t connected any more." };
    }
    const { data } = await plaid.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: "guava",
      country_codes: PLAID_COUNTRY_CODES,
      language: "en",
      ...(update
        ? { access_token: decrypt(update.accessToken) }
        : { products: PLAID_PRODUCTS }),
    });
    return { ok: true, linkToken: data.link_token };
  } catch (error) {
    return failure("Plaid link token failed", error);
  }
}

/**
 * Whether an already saved bank connection has the same institution and an
 * account with the same last four digits and type.
 */
async function alreadyConnected(
  db: UserDb,
  institution: string | null,
  accounts: AccountBase[],
) {
  if (!institution) return false;
  const saved = await db.bankAccount.findMany({
    where: { item: { institutionName: institution } },
    select: { mask: true, type: true, subtype: true },
  });
  const key = (a: { mask: string | null; type: string; subtype: unknown }) =>
    `${a.mask}/${a.type}/${a.subtype ?? ""}`;
  const savedKeys = new Set(saved.map(key));
  return accounts.some((a) => a.mask && savedKeys.has(key(a)));
}

/**
 * Step 3 of Plaid Link: swaps the one-time public token for an access token,
 * saves the bank and its accounts, then runs the first sync.
 */
export async function connectBank(
  publicToken: unknown,
): Promise<BankResult<SyncCounts & { institution: string }>> {
  if (typeof publicToken !== "string" || !/^[\w-]{1,200}$/.test(publicToken)) {
    return { ok: false, error: "Plaid sent an invalid token. Try again." };
  }
  try {
    const db = await getUserDb();
    const plaid = await userPlaidClient(db);

    const { data: exchange } = await plaid.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const accessToken = exchange.access_token;
    const { data: accountsData } = await plaid.accountsGet({
      access_token: accessToken,
    });
    const institution =
      accountsData.item.institution_name ??
      (accountsData.item.institution_id
        ? (
            await plaid.institutionsGetById({
              institution_id: accountsData.item.institution_id,
              country_codes: PLAID_COUNTRY_CODES,
            })
          ).data.institution.name
        : null);

    // Linking the same bank again makes a new Plaid connection with new
    // account and transaction ids, which would import everything twice.
    if (await alreadyConnected(db, institution, accountsData.accounts)) {
      await plaid
        .itemRemove({ access_token: accessToken })
        .catch((error) => logPlaidError("Plaid item remove failed", error));
      return {
        ok: false,
        error: `${institution ?? "That bank"} is already connected.`,
      };
    }

    const item = await db.plaidItem.upsert({
      where: { plaidItemId: exchange.item_id },
      update: {
        accessToken: encrypt(accessToken),
        institutionName: institution,
      },
      create: {
        plaidItemId: exchange.item_id,
        accessToken: encrypt(accessToken),
        institutionName: institution,
      },
      select: { id: true },
    });
    for (const a of accountsData.accounts) {
      const fields = {
        name: a.name,
        mask: a.mask,
        type: a.type,
        subtype: a.subtype ?? null,
      };
      await db.bankAccount.upsert({
        where: { plaidAccountId: a.account_id },
        update: fields,
        create: { ...fields, plaidAccountId: a.account_id, itemId: item.id },
      });
    }

    const counts = await syncItem(db, plaid, item.id);
    return { ok: true, institution: institution ?? "Your bank", ...counts };
  } catch (error) {
    return failure("Connecting a bank failed", error);
  }
}

/**
 * "Sync now": pulls new and changed transactions from every connected bank.
 * A bank that asks the user to sign in again is flagged and skipped (until
 * it's reconnected) instead of failing the whole sync.
 */
export async function syncBanks(): Promise<
  BankResult<SyncCounts & { loginRequired: string[] }>
> {
  try {
    const db = await getUserDb();
    const plaid = await userPlaidClient(db);
    const items = await db.plaidItem.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, institutionName: true, loginRequired: true },
    });
    const total: SyncCounts = { added: 0, updated: 0, removed: 0 };
    const loginRequired: string[] = [];
    for (const item of items) {
      const name = item.institutionName ?? "A bank";
      if (item.loginRequired) {
        loginRequired.push(name);
        continue;
      }
      try {
        const counts = await syncItem(db, plaid, item.id);
        total.added += counts.added;
        total.updated += counts.updated;
        total.removed += counts.removed;
      } catch (error) {
        if (plaidErrorCode(error) !== "ITEM_LOGIN_REQUIRED") throw error;
        await db.plaidItem.update({
          where: { id: item.id },
          data: { loginRequired: true },
        });
        loginRequired.push(name);
      }
    }
    return { ok: true, ...total, loginRequired };
  } catch (error) {
    return failure("Bank sync failed", error);
  }
}

/**
 * After the user signed in again through Link's update mode: clears the flag
 * and catches up on what was missed.
 */
export async function reconnectBank(
  id: unknown,
): Promise<BankResult<SyncCounts & { institution: string }>> {
  try {
    const db = await getUserDb();
    const plaid = await userPlaidClient(db);
    const item = await db.plaidItem.update({
      where: { id: itemId(id) },
      data: { loginRequired: false },
      select: { id: true, institutionName: true },
    });
    const counts = await syncItem(db, plaid, item.id);
    return {
      ok: true,
      institution: item.institutionName ?? "Your bank",
      ...counts,
    };
  } catch (error) {
    return failure("Reconnecting a bank failed", error);
  }
}

/**
 * Disconnects a bank: Plaid stops access (and billing) for it, and its saved
 * connection and accounts are deleted. Expenses imported from it stay; they
 * just stop updating.
 */
export async function disconnectBank(
  id: unknown,
): Promise<BankResult<{ institution: string }>> {
  try {
    const db = await getUserDb();
    const item = await db.plaidItem.findUnique({
      where: { id: itemId(id) },
      select: { id: true, accessToken: true, institutionName: true },
    });
    if (!item) return { ok: true, institution: "The bank" };
    const plaid = await userPlaidClient(db);
    try {
      await plaid.itemRemove({ access_token: decrypt(item.accessToken) });
    } catch (error) {
      // Plaid may already consider it gone (expired, or removed from the
      // Plaid dashboard); delete the local connection either way.
      if (plaidErrorCode(error) !== "ITEM_NOT_FOUND") {
        logPlaidError("Plaid item remove failed", error);
      }
    }
    await db.plaidItem.delete({ where: { id: item.id } });
    return { ok: true, institution: item.institutionName ?? "The bank" };
  } catch (error) {
    return failure("Disconnecting a bank failed", error);
  }
}
