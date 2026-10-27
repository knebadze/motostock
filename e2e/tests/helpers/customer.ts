import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Browser, type Page } from "@playwright/test";
import { BACKEND_URL, BASE_URL } from "../../env.js";
import { withDb } from "./db";
import { pickDate } from "./admin";

// Building blocks for the storefront customer suites (tests/customer/*).
// Everything goes through the real UI in the Georgian locale; the DB is only
// touched for things a local machine can't do (there's no SMTP, so the
// email-verification link is never delivered).

export const LOCALE_URL = `${BASE_URL}/ka`;

export type Customer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
};

export function newCustomer(run: string, label = "Customer"): Customer {
  return {
    firstName: "E2E-TEST",
    lastName: `${label} ${run}`,
    email: `e2e-test-${label.toLowerCase()}-${run}@example.com`,
    // Unique 9-digit Georgian mobile per run.
    phone: `+9955${String(Date.now()).slice(-8)}`,
    password: "supersecret123",
  };
}

// The cookie notice sits over the bottom of the page — close it once.
export async function dismissCookieNotice(page: Page): Promise<void> {
  const button = page.getByRole("button", { name: /^(გასაგებია|უარი)$/ }).first();
  if (await button.isVisible({ timeout: 2_000 }).catch(() => false)) await button.click();
}

export async function registerViaUi(page: Page, customer: Customer): Promise<void> {
  await page.goto(`${LOCALE_URL}/register`, { waitUntil: "networkidle" });
  await dismissCookieNotice(page);
  await page.fill("#first-name", customer.firstName);
  await page.fill("#last-name", customer.lastName);
  await page.fill("#email", customer.email);
  await page.fill("#phone", customer.phone);
  await pickDate(page, page.locator("#date-of-birth"), { year: 1992, monthsAhead: 0, day: 12 });
  await page.fill("#password", customer.password);
  await page.fill("#confirm-password", customer.password);
  await page.locator('main form input[type="checkbox"]').check();
  await page.locator('main form button[type="submit"]').click();
  await page.waitForURL(/\/ka\/account/, { timeout: 15_000 });
}

export async function loginViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${LOCALE_URL}/login`, { waitUntil: "networkidle" });
  await dismissCookieNotice(page);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.locator('main form button[type="submit"]').click();
  await page.waitForURL(/\/ka\/account/, { timeout: 15_000 });
}

export async function logoutViaHeader(page: Page): Promise<void> {
  await page.goto(LOCALE_URL, { waitUntil: "networkidle" });
  await page.locator('header button[aria-haspopup="menu"]').first().click();
  await page.getByRole("menuitem", { name: "გასვლა" }).or(page.getByRole("button", { name: "გასვლა" })).first().click();
  await expect(page.locator("header")).toContainText("შესვლა");
}

// No SMTP locally, so the verification mail never arrives — mark the test
// account verified directly (fixture setup, not the flow under test).
export async function markEmailVerified(email: string): Promise<void> {
  await withDb((client) =>
    client.query(`UPDATE "dbo"."User" SET "emailVerifiedAt" = NOW() WHERE "email" = $1`, [email]),
  );
}

export function toastWith(page: Page, text: string | RegExp) {
  return page.locator("[data-sonner-toast]").filter({ hasText: text }).first();
}

// One login per run is plenty: later customer groups reuse the session the
// first login produced (saved under e2e/.admin-state), so the chain stays
// well inside the backend's login rate limit (20 per 15 min per IP).
const AUTH_STATE = resolve(dirname(fileURLToPath(import.meta.url)), "../../.admin-state/customer-auth.json");

export async function customerPage(browser: Browser, email: string, password: string): Promise<Page> {
  if (existsSync(AUTH_STATE)) {
    const context = await browser.newContext({ storageState: AUTH_STATE });
    const page = await context.newPage();
    const me = await page.request.get(`${BACKEND_URL}/api/users/me`);
    if (me.ok() && ((await me.json()) as { user: { email: string } }).user.email === email) return page;
    await context.close();
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginViaUi(page, email, password);
  await context.storageState({ path: AUTH_STATE });
  return page;
}

export async function saveCustomerSession(page: Page): Promise<void> {
  await page.context().storageState({ path: AUTH_STATE });
}
