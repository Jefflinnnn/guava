// Runs `docker compose` on compose.test.yaml with the test databases'
// password: random, made on first use and kept in tests/db/.password
// (gitignored), so no credential is ever committed. tests/env.ts reads it.
//
//   node tests/db/compose.mjs up -d --wait
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const file = new URL("./.password", import.meta.url);
if (!existsSync(file)) writeFileSync(file, randomBytes(16).toString("hex"));
const secret = readFileSync(file, "utf8").trim();

// How the proxy reaches Postgres inside the compose network.
const upstream = new URL("postgres://postgres@postgres:5432/guava");
upstream.password = secret;

execFileSync(
  "docker",
  ["compose", "-f", "compose.test.yaml", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      POSTGRES_PASSWORD: secret,
      PG_CONNECTION_STRING: upstream.toString(),
    },
  },
);
