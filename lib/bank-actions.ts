"use server";

import { getCurrentUserId } from "@/lib/current-user";
import { encrypt } from "@/lib/crypto";
import {
  logPlaidError,
  NoPlaidKeysError,
  PLAID_COUNTRY_CODES,
  PLAID_PRODUCTS,
  plaidErrorCode,
  userPlaidClient,
} from "@/lib/plaid";
import { syncItem, type SyncCounts } from "@/lib/plaid-sync";
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

/** Step 1 of Plaid Link: a short-lived token that opens the Link modal. */
export async function createLinkToken(): Promise<
  BankResult<{ linkToken: string }>
> {
  try {
    const userId = await getCurrentUserId();
    const plaid = await userPlaidClient(await getUserDb());
    const { data } = await plaid.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: "guava",
      products: PLAID_PRODUCTS,
      country_codes: PLAID_COUNTRY_CODES,
      language: "en",
    });
    return { ok: true, linkToken: data.link_token };
  } catch (error) {
    return failure("Plaid link token failed", error);
  }
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
        name: a.official_name ?? a.name,
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

/** "Sync now": pulls new and changed transactions from every connected bank. */
export async function syncBanks(): Promise<BankResult<SyncCounts>> {
  try {
    const db = await getUserDb();
    const plaid = await userPlaidClient(db);
    const items = await db.plaidItem.findMany({ select: { id: true } });
    const total: SyncCounts = { added: 0, updated: 0, removed: 0 };
    for (const { id } of items) {
      const counts = await syncItem(db, plaid, id);
      total.added += counts.added;
      total.updated += counts.updated;
      total.removed += counts.removed;
    }
    return { ok: true, ...total };
  } catch (error) {
    return failure("Bank sync failed", error);
  }
}
