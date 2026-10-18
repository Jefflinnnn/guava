"use server";

import { encrypt } from "@/lib/crypto";
import { getCurrentUserId, UnauthorizedError } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { migrateUserDb } from "@/lib/user-db/migrate";
import { testNeonUrl } from "@/lib/workspace";
import {
  NEON_URL_MAX,
  neonDetail,
  stripWhitespace,
  type TestResult,
} from "@/lib/workspace-validation";

const SIGNED_OUT: TestResult = {
  ok: false,
  error: "Your session ended. Log in again.",
};

// Server actions take whatever the client sends; normalize it the same way
// the form does before using it.
function urlInput(input: unknown): string {
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

/** "Test connection": checks the string without creating or saving anything. */
export async function testWorkspace(input: unknown): Promise<TestResult> {
  if (!(await userIdOrNull())) return SIGNED_OUT;
  const result = await testNeonUrl(urlInput(input));
  return result.ok
    ? { ok: true, detail: neonDetail(result.details) }
    : { ok: false, error: result.error };
}

/**
 * Makes this database the user's workspace: tests it, creates or updates
 * guava's tables in it, then saves the encrypted connection string. Used by
 * onboarding and by the Integrations page (to switch databases).
 */
export async function connectWorkspace(input: unknown): Promise<TestResult> {
  const userId = await userIdOrNull();
  if (!userId) return SIGNED_OUT;

  const url = urlInput(input);
  const test = await testNeonUrl(url);
  if (!test.ok) return test;

  let schemaVersion: string;
  try {
    schemaVersion = await migrateUserDb(url);
  } catch (error) {
    console.error("Workspace setup failed", error);
    const detail = error instanceof Error ? ` (${error.message})` : "";
    return {
      ok: false,
      error: `Connected, but couldn’t create guava’s tables in this database${detail}. A new, empty database works best.`,
    };
  }

  const data = {
    neonUrl: encrypt(url),
    database: test.details.database,
    region: test.details.region,
    pgVersion: test.details.pgVersion,
    schemaVersion,
  };
  try {
    await prisma.workspace.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  } catch (error) {
    console.error("Saving workspace failed", error);
    return {
      ok: false,
      error: "The database is ready, but saving failed. Try again.",
    };
  }
  return { ok: true, detail: neonDetail(test.details) };
}
