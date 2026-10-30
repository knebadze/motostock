import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { BACKEND_URL, BASE_URL } from "../../env.js";

// Every staff spec logs in, and the full chain (admin → customer → operator →
// deletion) would otherwise burn ~12 of the backend's 20-per-15-min login
// attempts per run. The first UI login's cookies are saved under
// e2e/.admin-state and reused while the backend still accepts them for that
// role. Seed accounts (backend/prisma/seed.ts) — never changed by the suites.
const STAFF = {
  ADMIN: { email: "admin@gmail.com", password: "admin123", state: "admin-auth.json" },
  OPERATOR: { email: "operator@gmail.com", password: "operator123", state: "operator-auth.json" },
} as const;
type StaffRole = keyof typeof STAFF;

const stateFile = (role: StaffRole) =>
  resolve(dirname(fileURLToPath(import.meta.url)), "../../.admin-state", STAFF[role].state);

async function reuseSavedSession(page: Page, role: StaffRole): Promise<boolean> {
  if (!existsSync(stateFile(role))) return false;
  const { cookies } = JSON.parse(readFileSync(stateFile(role), "utf8")) as {
    cookies: Parameters<ReturnType<Page["context"]>["addCookies"]>[0];
  };
  await page.context().addCookies(cookies);
  const me = await page.request.get(`${BACKEND_URL}/api/users/me`);
  if (me.ok() && ((await me.json()) as { user?: { role?: string } }).user?.role === role) {
    await page.goto("/admin", { waitUntil: "networkidle" });
    return true;
  }
  await page.context().clearCookies();
  return false;
}

export async function loginAsStaff(page: Page, role: StaffRole): Promise<void> {
  if (await reuseSavedSession(page, role)) return;
  await page.goto("/admin/login", { waitUntil: "networkidle" });
  await page.fill("#email", STAFF[role].email);
  await page.fill("#password", STAFF[role].password);
  await page.click('button:has-text("შესვლა")');
  await page.waitForURL(`${BASE_URL}/admin`, { timeout: 15_000 });
  await page.context().storageState({ path: stateFile(role) });
}

export const loginAsAdmin = (page: Page) => loginAsStaff(page, "ADMIN");
export const loginAsOperator = (page: Page) => loginAsStaff(page, "OPERATOR");
