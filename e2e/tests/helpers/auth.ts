import type { Page } from "@playwright/test";

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/admin/login", { waitUntil: "networkidle" });
  await page.fill("#email", "admin@gmail.com");
  await page.fill("#password", "admin123");
  await page.click('button:has-text("შესვლა")');
  await page.waitForURL("http://localhost:3000/admin", { timeout: 15_000 });
}
