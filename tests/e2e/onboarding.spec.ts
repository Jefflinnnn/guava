import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

// The test user's login, made up per run. "e2e" covers the letter and
// number rules.
const LOGIN = `e2e-${randomUUID()}`;

function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function signUp(page: Page, email: string) {
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Buzz Peterson");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(LOGIN);
  await page.getByLabel(/I agree to the Terms/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/connect$/);
}

async function connectDatabase(page: Page) {
  await page
    .getByRole("textbox", { name: "Connection string" })
    .fill(process.env.WORKSPACE_URL_E2E!);
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

test("signed-out visitors are sent to log in", async ({ page }) => {
  await page.goto("/expenses");
  await expect(page).toHaveURL(/\/login$/);
});

test("sign up, connect a database, and open expenses", async ({ page }) => {
  await signUp(page, uniqueEmail());
  await expect(
    page.getByRole("heading", { name: "Connect your database, Buzz" }),
  ).toBeVisible();
  await connectDatabase(page);

  await page.goto("/expenses");
  await expect(
    page.getByRole("heading", { level: 1, name: "Expenses" }),
  ).toBeVisible();
  // A brand-new workspace has no transactions yet.
  await expect(page.getByText("0 total transactions")).toBeVisible();
});

test("log out and back in", async ({ page }) => {
  const email = uniqueEmail();
  await signUp(page, email);
  await connectDatabase(page);
  await page.context().clearCookies();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(LOGIN);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/$/);
});
