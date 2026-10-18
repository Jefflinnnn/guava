"use server";

import { encrypt } from "@/lib/crypto";
import { getCurrentUserId, UnauthorizedError } from "@/lib/current-user";
import {
  testNeonUrl,
  testPlaidKeys,
  type NeonDetails,
  type PlaidKeys,
  type TestResult,
} from "@/lib/integrations";
import {
  isPlaidEnv,
  neonDetail,
  NEON_URL_MAX,
  PLAID_CLIENT_ID_LENGTH,
  PLAID_SECRET_LENGTH,
  stripWhitespace,
} from "@/lib/integrations-validation";
import { prisma } from "@/lib/prisma";

const SIGNED_OUT: TestResult = {
  ok: false,
  error: "Your session ended. Log in again.",
};
const SAVE_FAILED: TestResult = {
  ok: false,
  error: "The test passed, but saving failed. Try again in a moment.",
};

// Server actions take whatever the client sends; normalize it the same way
// the form does before testing.
function plaidInput(input: unknown): PlaidKeys {
  const raw = (input ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    env: isPlaidEnv(raw.env) ? raw.env : "sandbox",
    clientId: stripWhitespace(str(raw.clientId), PLAID_CLIENT_ID_LENGTH),
    secret: stripWhitespace(str(raw.secret), PLAID_SECRET_LENGTH),
  };
}

function neonInput(input: unknown): string {
  return typeof input === "string" ? stripWhitespace(input, NEON_URL_MAX) : "";
}

async function userIdOrNull(): Promise<string | null> {
  try {
    return await getCurrentUserId();
  } catch (error) {
    if (error instanceof UnauthorizedError) return null;
    throw error;
  }
}

function plaidData(keys: PlaidKeys) {
  return {
    plaidEnv: keys.env,
    plaidClientId: keys.clientId,
    plaidSecret: encrypt(keys.secret),
    plaidVerifiedAt: new Date(),
  };
}

function neonData(url: string, details: NeonDetails) {
  return {
    neonUrl: encrypt(url),
    neonDatabase: details.database,
    neonRegion: details.region,
    neonPgVersion: details.pgVersion,
    neonVerifiedAt: new Date(),
  };
}

async function saveKeys(
  userId: string,
  data: Partial<ReturnType<typeof plaidData> & ReturnType<typeof neonData>>,
) {
  await prisma.integrationKeys.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

/**
 * Tests Plaid keys. With `save`, keys that pass replace the saved ones
 * (the Integrations page, where "changes take effect after a successful test").
 */
export async function testPlaid(
  input: unknown,
  { save = false }: { save?: boolean } = {},
): Promise<TestResult> {
  const userId = await userIdOrNull();
  if (!userId) return SIGNED_OUT;
  const keys = plaidInput(input);
  const result = await testPlaidKeys(keys, userId);
  if (!result.ok || !save) return result;
  try {
    await saveKeys(userId, plaidData(keys));
  } catch (error) {
    console.error("Saving Plaid keys failed", error);
    return SAVE_FAILED;
  }
  return result;
}

/** Tests a Neon connection string. `save` works as in `testPlaid`. */
export async function testNeon(
  input: unknown,
  { save = false }: { save?: boolean } = {},
): Promise<TestResult> {
  const userId = await userIdOrNull();
  if (!userId) return SIGNED_OUT;
  const url = neonInput(input);
  const result = await testNeonUrl(url);
  if (!result.ok) return result;
  if (save) {
    try {
      await saveKeys(userId, neonData(url, result.details));
    } catch (error) {
      console.error("Saving Neon connection failed", error);
      return SAVE_FAILED;
    }
  }
  return { ok: true, detail: neonDetail(result.details) };
}

/**
 * Onboarding's "Save and connect a bank": re-tests both on the server (the
 * browser's earlier results aren't trusted) and saves only if both pass.
 */
export async function saveIntegrations(input: {
  plaid: unknown;
  neon: unknown;
}): Promise<{ saved: boolean; plaid: TestResult; neon: TestResult }> {
  const userId = await userIdOrNull();
  if (!userId) return { saved: false, plaid: SIGNED_OUT, neon: SIGNED_OUT };

  const keys = plaidInput(input?.plaid);
  const url = neonInput(input?.neon);
  const [plaid, neonResult] = await Promise.all([
    testPlaidKeys(keys, userId),
    testNeonUrl(url),
  ]);
  const neon: TestResult = neonResult.ok
    ? { ok: true, detail: neonDetail(neonResult.details) }
    : neonResult;
  if (!plaid.ok || !neonResult.ok) return { saved: false, plaid, neon };

  try {
    await saveKeys(userId, {
      ...plaidData(keys),
      ...neonData(url, neonResult.details),
    });
  } catch (error) {
    console.error("Saving integrations failed", error);
    return { saved: false, plaid: SAVE_FAILED, neon: SAVE_FAILED };
  }
  return { saved: true, plaid, neon };
}
