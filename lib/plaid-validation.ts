// Validation for a user's Plaid API keys. Shared by the browser (live errors)
// and the server, which re-checks them.

export const PLAID_ENVS = ["sandbox", "production"] as const;
export type PlaidEnv = (typeof PLAID_ENVS)[number];

export function isPlaidEnv(v: unknown): v is PlaidEnv {
  return PLAID_ENVS.includes(v as PlaidEnv);
}

export const PLAID_KEY_MAX = 64;

// Plaid's keys are hex (a 24-character client ID, 30-character secrets);
// accept any short alphanumeric string in case that changes.
const PLAID_KEY = /^[A-Za-z0-9]{16,64}$/;

export function plaidClientIdError(value: string): string {
  if (!value) return "Paste your Plaid client ID.";
  return PLAID_KEY.test(value) ? "" : "That doesn’t look like a client ID.";
}

export function plaidSecretError(value: string): string {
  if (!value) return "Paste the secret for this environment.";
  return PLAID_KEY.test(value) ? "" : "That doesn’t look like a Plaid secret.";
}

/** What the browser may know about saved keys. Never the secret. */
export type PlaidKeyDetails = {
  env: PlaidEnv;
  /** The client ID's last 4 characters. */
  clientIdEnd: string;
};

export function plaidDetail({ env, clientIdEnd }: PlaidKeyDetails): string {
  const name = env === "sandbox" ? "Sandbox" : "Production";
  return `Keys work · ${name} · client ID ••••${clientIdEnd}`;
}
