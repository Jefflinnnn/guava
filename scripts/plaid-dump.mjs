// Dev tool: shows everything Plaid returns for a workspace's connected banks,
// next to what guava imported, so the mapping can be checked by eye.
//
//   pnpm plaid:dump              (when only one workspace exists)
//   pnpm plaid:dump you@x.com    (pick a workspace by its owner's email)
//
// Prints one line per transaction and writes the raw responses to
// .plaid-dump/ (gitignored). It reads from Plaid from the start of history and
// never touches the saved sync cursor, so it doesn't affect "Sync now".
// Access tokens and secrets are never printed or written.

import { createDecipheriv } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { neon } from "@neondatabase/serverless";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

const OUT_DIR = ".plaid-dump";

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

const money = (n) => (n < 0 ? "-" : " ") + "$" + Math.abs(n).toFixed(2);

const workspace = await pickWorkspace(process.argv[2]);
const db = neon(decrypt(workspace.neonUrl));
console.log(`Workspace ${workspace.database} (${workspace.email})`);

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

const imported = new Map(
  (
    await db.query(
      `SELECT "plaidTransactionId", "amountCents" FROM "Expense"
        WHERE "plaidTransactionId" IS NOT NULL`,
    )
  ).map((e) => [e.plaidTransactionId, e.amountCents]),
);

mkdirSync(OUT_DIR, { recursive: true });
for (const item of items) {
  const accessToken = decrypt(item.accessToken);
  let accounts, transactions;
  try {
    accounts = (await plaid.accountsGet({ access_token: accessToken })).data
      .accounts;
    transactions = await allTransactions(plaid, accessToken);
  } catch (error) {
    console.error(`${item.institutionName}: Plaid error ${plaidError(error)}`);
    continue;
  }
  const mask = new Map(accounts.map((a) => [a.account_id, a.mask ?? "????"]));

  const name = item.institutionName ?? item.id;
  console.log(`\n${name}: ${accounts.length} accounts`);
  for (const a of accounts) {
    console.log(
      `  ••${a.mask} ${a.type}/${a.subtype}  ${a.name}  balance ${a.balances.current}`,
    );
  }

  console.log(`\n${transactions.length} transactions (✓ = in guava)`);
  transactions.sort((a, b) => a.date.localeCompare(b.date));
  for (const t of transactions) {
    const inGuava = imported.has(t.transaction_id) ? "✓" : " ";
    console.log(
      [
        inGuava,
        t.date,
        `••${mask.get(t.account_id)}`,
        money(t.amount).padStart(11),
        (t.personal_finance_category?.primary ?? "-").padEnd(24),
        t.pending ? "pending" : "       ",
        `${t.merchant_name ?? "-"} | ${t.name}`,
      ].join("  "),
    );
  }

  const file = join(
    OUT_DIR,
    `${name.replace(/\W+/g, "-").toLowerCase()}-${item.id}.json`,
  );
  writeFileSync(file, JSON.stringify({ accounts, transactions }, null, 2));
  console.log(`\nRaw responses: ${file}`);
}
