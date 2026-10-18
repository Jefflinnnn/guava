// Validation for the bring-your-own-keys Integrations forms. Shared by the
// browser (live errors) and the server actions (which re-check everything).

export type PlaidEnv = "sandbox" | "production";

export const PLAID_ENVS: PlaidEnv[] = ["sandbox", "production"];
export const PLAID_CLIENT_ID_LENGTH = 24;
export const PLAID_SECRET_LENGTH = 30;
export const NEON_URL_MAX = 300;

export function isPlaidEnv(value: unknown): value is PlaidEnv {
  return value === "sandbox" || value === "production";
}

export function plaidEnvLabel(env: PlaidEnv): string {
  return env === "sandbox" ? "Sandbox" : "Production";
}

/** Keys are pasted, so whitespace is always a copy artifact. */
export function stripWhitespace(value: string, max: number): string {
  return value.replace(/\s/g, "").slice(0, max);
}

export function plaidClientIdError(value: string): string {
  if (!value) return "Enter your Plaid client ID.";
  if (!/^[a-f0-9]{24}$/i.test(value)) {
    return "Client IDs are 24 characters (0–9, a–f).";
  }
  return "";
}

export function plaidSecretError(value: string): string {
  if (!value) return "Enter your Plaid secret.";
  if (!/^[a-f0-9]{30}$/i.test(value)) {
    return "Secrets are 30 characters (0–9, a–f).";
  }
  return "";
}

const NEON_URL =
  /^postgres(ql)?:\/\/[^:/\s]+:[^@\s]+@[a-z0-9.-]+\.neon\.tech(:\d+)?\/[A-Za-z0-9_-]+(\?\S*)?$/;

/** Format errors, in the order the design lists them. */
export function neonUrlError(value: string): string {
  if (!value) return "Paste your Neon connection string.";
  if (!/^postgres(ql)?:\/\//.test(value)) {
    return "It should start with postgresql://";
  }
  if (!/\.neon\.tech(:\d+)?\//.test(value)) {
    return "That isn’t a Neon host — it should end in .neon.tech.";
  }
  if (!NEON_URL.test(value)) {
    return "Include a user, password, host and database name.";
  }
  return "";
}

export const NEON_SSL_ERROR =
  "Neon requires SSL. Add ?sslmode=require to the end of the string.";

export function neonUrlHasSsl(value: string): boolean {
  return /[?&]sslmode=require(&|$)/.test(value);
}

/**
 * "us-east-2" from ep-….us-east-2.aws.neon.tech, including newer hosts with a
 * cell segment like ep-…-pooler.c-6.us-east-2.aws.neon.tech.
 */
export function neonRegionOf(value: string): string {
  return (
    value.match(/\.([a-z0-9-]+)\.(?:aws|azure)\.neon\.tech/)?.[1] ?? "neon"
  );
}

export type NeonDetails = {
  database: string;
  region: string;
  pgVersion: number;
};

/** Success lines under each card after a passing test. */
export function plaidDetail(env: PlaidEnv): string {
  return `Keys verified · ${plaidEnvLabel(env)} · Transactions product enabled`;
}

export function neonDetail({ database, region, pgVersion }: NeonDetails) {
  return `Connected to ${database} · ${region} · Postgres ${pgVersion}`;
}
