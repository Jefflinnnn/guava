import "server-only";

import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
} from "plaid";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. See .env.example.`);
  return value;
}

let client: PlaidApi | undefined;

// Created lazily so a missing key fails the request that needs it,
// not the whole build.
export function getPlaidClient(): PlaidApi {
  if (client) return client;

  const env = process.env.PLAID_ENV ?? "sandbox";
  const basePath = PlaidEnvironments[env];
  if (!basePath) throw new Error(`Unknown PLAID_ENV "${env}".`);

  client = new PlaidApi(
    new Configuration({
      basePath,
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": required("PLAID_CLIENT_ID"),
          "PLAID-SECRET": required("PLAID_SECRET"),
        },
      },
    })
  );
  return client;
}

export function plaidProducts(): Products[] {
  return (process.env.PLAID_PRODUCTS ?? "transactions")
    .split(",")
    .map((p) => p.trim() as Products);
}

export function plaidCountryCodes(): CountryCode[] {
  return (process.env.PLAID_COUNTRY_CODES ?? "US")
    .split(",")
    .map((c) => c.trim() as CountryCode);
}
