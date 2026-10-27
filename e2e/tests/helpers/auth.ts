import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { BACKEND_URL, BASE_URL } from "../../env.js";

// Every admin spec logs in, and the full chain (admin → customer → deletion)
// would otherwise burn ~10 of the backend's 20-per-15-min login attempts per
// run. The first UI login's cookies are saved under e2e/.admin-state and
// reused while the backend still accepts them as an ADMIN session.
const AUTH_STATE = resolve(dirname(fileURLToPath(import.meta.url)), "../../.admin-state/admin-auth.json");

async function reuseSavedSession(page: Page): Promise<boolean> {
  if (!existsSync(AUTH_STATE)) return false;
  const { cookies } = JSON.parse(readFileSync(AUTH_STATE, "utf8")) as {
    cookies: Parameters<ReturnType<Page["context"]>["addCookies"]>[0];
  };
  await page.context().addCookies(cookies);
  const me = await page.request.get(`${BACKEND_URL}/api/users/me`);
  if (me.ok() && ((await me.json()) as { user?: { role?: string } }).user?.role === "ADMIN") {
    await page.goto("/admin", { waitUntil: "networkidle" });
    return true;
  }
  await page.context().clearCookies();
  return false;
}

export async function loginAsAdmin(page: Page): Promise<void> {
  if (await reuseSavedSession(page)) return;
  await page.goto("/admin/login", { waitUntil: "networkidle" });
  await page.fill("#email", "admin@gmail.com");
  await page.fill("#password", "admin123");
  await page.click('button:has-text("შესვლა")');
  await page.waitForURL(`${BASE_URL}/admin`, { timeout: 15_000 });
  await page.context().storageState({ path: AUTH_STATE });
}
