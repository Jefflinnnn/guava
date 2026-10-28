import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Settings for the tests and the app under test, all pointing at the
// databases in compose.test.yaml. Built here rather than kept in an env file
// so no credential is committed, and passed explicitly so they override .env.

const DB_HOST = "localhost:54329";
// Workspace URLs must look like Neon's to pass the app's checks. The local
// proxy (NEON_LOCAL_PROXY) ignores the host.
const FAKE_NEON_HOST = "ep-guava-test.us-east-2.aws.neon.tech";
const APP_PORT = 3100;

function dbPassword(): string {
  try {
    return readFileSync(resolve("tests/db/.password"), "utf8").trim();
  } catch {
    throw new Error("Start the test databases first: pnpm test:db:up");
  }
}

/** Throws until `pnpm test:db:up` has run once. */
export function readTestEnv(): Record<string, string> {
  const password = dbPassword();
  const url = (host: string, db: string) =>
    `postgresql://postgres:${password}@${host}/${db}`;
  const key = () => randomBytes(32).toString("base64");
  return {
    DATABASE_URL: url(DB_HOST, "guava"),
    DIRECT_URL: url(DB_HOST, "guava"),
    NEON_LOCAL_PROXY: "localhost:4444",
    WORKSPACE_URL_INTEGRATION: `${url(FAKE_NEON_HOST, "workspace_integration")}?sslmode=require`,
    WORKSPACE_URL_E2E: `${url(FAKE_NEON_HOST, "workspace_e2e")}?sslmode=require`,
    BETTER_AUTH_URL: `http://localhost:${APP_PORT}`,
    // Fresh each run: nothing outlives the test databases.
    BETTER_AUTH_SECRET: key(),
    ENCRYPTION_KEY: key(),
  };
}
