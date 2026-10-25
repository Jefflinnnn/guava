// Dev tool: prints the raw Plaid API data for a workspace's connected banks
// as JSON, for piping into jq.
//
//   pnpm -s plaid:dump | jq '.[].transactions[] | {date, amount, name}'
//   pnpm -s plaid:dump you@x.com     (when there are several workspaces)
//
// Output: one entry per bank, with /accounts/get's accounts and every
// transaction /transactions/sync returns from the start of history. It never
// touches the saved sync cursor, so it doesn't affect "Sync now". Access
// tokens and secrets are never printed.

import { createDecipheriv } from "node:crypto";

import { neon } from "@neondatabase/serverless";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

// Same precedence as Next: .env.local wins over .env (neither overrides the
// shell's own variables).
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // Missing file.
  }
}

function decrypt(payload) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY ?? "", "base64");
  if (key.length !== 32) fail("ENCRYPTION_KEY must be set (see .env.example).");
  const [iv, tag, ciphertext] = payload
    .split(".")
    .map((part) => Buffer.from(part, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

/** Plaid's error code, never the error itself (it carries the secret). */
function plaidError(error) {
  return error?.response?.data?.error_code ?? error?.message ?? "unknown";
}

async function pickWorkspace(email) {
  if (!process.env.DATABASE_URL) fail("DATABASE_URL must be set.");
  const app = neon(process.env.DATABASE_URL);
  const rows = await app.query(
    `SELECT u.email, w."neonUrl", w.database
       FROM "Workspace" w JOIN "User" u ON u.id = w."userId"
      ORDER BY u.email`,
  );
  const matches = email ? rows.filter((r) => r.email === email) : rows;
  if (matches.length === 1) return matches[0];
  fail(
    matches.length
      ? `Several workspaces. Pass an email: ${rows.map((r) => r.email).join(", ")}`
      : `No workspace${email ? ` for ${email}` : ""}.`,
  );
}

async function allTransactions(plaid, accessToken) {
  const added = [];
  let cursor;
  for (;;) {
    const { data } = await plaid.transactionsSync({
      access_token: accessToken,
      cursor,
      count: 500,
    });
    added.push(...data.added);
    cursor = data.next_cursor;
    if (!data.has_more) return added;
  }
}

const workspace = await pickWorkspace(process.argv[2]);
const db = neon(decrypt(workspace.neonUrl));

const [config] = await db.query(
  `SELECT "clientId", secret, env FROM "PlaidConfig" WHERE id = 1`,
);
if (!config) fail("No Plaid keys saved in this workspace.");
const plaid = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[config.env],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": config.clientId,
        "PLAID-SECRET": decrypt(config.secret),
      },
    },
  }),
);

const items = await db.query(
  `SELECT id, "institutionName", "accessToken" FROM "PlaidItem" ORDER BY "createdAt"`,
);
if (!items.length) fail("No banks connected in this workspace.");

const banks = [];
for (const item of items) {
  const accessToken = decrypt(item.accessToken);
  try {
    const { data } = await plaid.accountsGet({ access_token: accessToken });
    banks.push({
      institution: item.institutionName,
      item: data.item,
      accounts: data.accounts,
      transactions: await allTransactions(plaid, accessToken),
    });
  } catch (error) {
    console.error(`${item.institutionName}: Plaid error ${plaidError(error)}`);
  }
}
console.log(JSON.stringify(banks, null, 2));
