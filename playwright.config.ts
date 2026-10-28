import { defineConfig, devices } from "@playwright/test";

import { readTestEnv } from "./tests/env";

// The app runs as a production build against the databases in
// compose.test.yaml (`pnpm test:db:up`), with tests/env.ts overriding .env.
const env = readTestEnv();
// The tests read WORKSPACE_URL_E2E too.
Object.assign(process.env, env);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL: env.BETTER_AUTH_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm db:deploy && pnpm build && pnpm start --port ${new URL(env.BETTER_AUTH_URL).port}`,
    // Answers once the app can reach its database.
    url: `${env.BETTER_AUTH_URL}/api/health`,
    env,
    // Never reuse a dev server: it would be pointed at .env's databases.
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
