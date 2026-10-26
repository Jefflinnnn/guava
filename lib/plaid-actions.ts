"use server";

import { encrypt } from "@/lib/crypto";
import {
  logPlaidError,
  PLAID_COUNTRY_CODES,
  plaidClient,
  plaidErrorCode,
  type PlaidKeys,
} from "@/lib/plaid";
import {
  isPlaidEnv,
  PLAID_KEY_MAX,
  plaidClientIdError,
  plaidDetail,
  plaidSecretError,
} from "@/lib/plaid-validation";
import type { TestResult } from "@/lib/workspace-validation";
import { getUserDb } from "@/lib/workspace";

export type PlaidKeysInput = { clientId: string; secret: string; env: string };

// Server actions take whatever the client sends; re-check it.
function keysInput(input: unknown): PlaidKeys | string {
  const raw = (input ?? {}) as Partial<Record<keyof PlaidKeysInput, unknown>>;
  const clean = (v: unknown) =>
    typeof v === "string" ? v.replace(/\s/g, "").slice(0, PLAID_KEY_MAX) : "";
  const clientId = clean(raw.clientId);
  const secret = clean(raw.secret);
  if (!isPlaidEnv(raw.env)) return "Pick sandbox or production.";
  return (
    plaidClientIdError(clientId) ||
    plaidSecretError(secret) || { clientId, secret, env: raw.env }
  );
}

/** Makes one cheap authenticated call to check the keys. */
async function checkKeys(keys: PlaidKeys): Promise<TestResult> {
  try {
    await plaidClient(keys).institutionsGet({
      count: 1,
      offset: 0,
      country_codes: PLAID_COUNTRY_CODES,
    });
    return {
      ok: true,
      detail: plaidDetail({
        env: keys.env,
        clientIdEnd: keys.clientId.slice(-4),
      }),
    };
  } catch (error) {
    const code = plaidErrorCode(error);
    if (code === "INVALID_API_KEYS" || code === "INVALID_CLIENT_ID") {
      return {
        ok: false,
        error: `Plaid rejected these keys for ${keys.env}. Check that the secret matches the environment.`,
      };
    }
    logPlaidError("Plaid key test failed", error);
    return { ok: false, error: "Couldn’t reach Plaid. Try again." };
  }
}

/** "Test keys": checks them without saving. */
export async function testPlaidKeys(input: unknown): Promise<TestResult> {
  await getUserDb(); // signed in, with a workspace
  const keys = keysInput(input);
  return typeof keys === "string"
    ? { ok: false, error: keys }
    : checkKeys(keys);
}

/** Tests the keys, then saves them (secret encrypted) in the user's database. */
export async function savePlaidKeys(input: unknown): Promise<TestResult> {
  const db = await getUserDb();
  const keys = keysInput(input);
  if (typeof keys === "string") return { ok: false, error: keys };
  const result = await checkKeys(keys);
  if (!result.ok) return result;
  const data = {
    clientId: keys.clientId,
    secret: encrypt(keys.secret),
    env: keys.env,
  };
  await db.plaidConfig.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
  return result;
}

/** Forgets the saved keys. */
export async function removePlaidKeys(): Promise<void> {
  const db = await getUserDb();
  await db.plaidConfig.deleteMany();
}
