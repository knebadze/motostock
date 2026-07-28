import { test, expect } from "@playwright/test";
import { uniqueTestEmail, uniqueTestName } from "./helpers/fixtures";
import { deleteUserByEmail } from "./helpers/db";
import { BASE_URL } from "../env.js";

test("customer can register, log out, and log back in", async ({ page }) => {
  const email = uniqueTestEmail();
  const name = uniqueTestName("Customer");
  const password = "supersecret123";

  try {
    await test.step("register with mismatched passwords is rejected client-side", async () => {
      await page.goto(`${BASE_URL}/ka/register`, { waitUntil: "networkidle" });
      await page.fill("#name", name);
      await page.fill("#email", email);
      await page.fill("#password", password);
      await page.fill("#confirm-password", "somethingElse123");
      await page.click('button[type="submit"]');
      await page.waitForTimeout(300);
      await expect(page.locator("[data-sonner-toast]")).toContainText("პაროლები არ ემთხვევა");
      await expect(page).toHaveURL(/\/register$/);
    });

    await test.step("register with matching passwords logs in and redirects to /account", async () => {
      await page.fill("#confirm-password", password);
      await page.click('button[type="submit"]');
      await page.waitForURL(`${BASE_URL}/ka/account`, { timeout: 10_000 });
    });

    await test.step("header shows the authenticated user's name", async () => {
      await page.goto(`${BASE_URL}/ka`, { waitUntil: "networkidle" });
      await expect(page.locator("header")).toContainText(name);
    });

    await test.step("visiting /login while authenticated redirects to /account", async () => {
      await page.goto(`${BASE_URL}/ka/login`, { waitUntil: "networkidle" });
      await expect(page).toHaveURL(`${BASE_URL}/ka/account`);
    });

    await test.step("log out via the header menu", async () => {
      await page.goto(`${BASE_URL}/ka`, { waitUntil: "networkidle" });
      await page.click('header button[aria-haspopup="menu"]');
      await page.click('button:has-text("გასვლა")');
      await page.waitForTimeout(300);
      await expect(page.locator("header")).toContainText("შესვლა");
    });

    await test.step("logging in with the wrong password shows a localized error", async () => {
      await page.goto(`${BASE_URL}/ka/login`, { waitUntil: "networkidle" });
      await page.fill("#email", email);
      await page.fill("#password", "wrongpassword");
      await page.click('button[type="submit"]');
      await page.waitForTimeout(300);
      await expect(page.locator("[data-sonner-toast]")).toContainText("ელფოსტა ან პაროლი არასწორია");
      await expect(page).toHaveURL(/\/login$/);
    });

    await test.step("logging in with the correct password succeeds", async () => {
      await page.fill("#password", password);
      await page.click('button[type="submit"]');
      await page.waitForURL(`${BASE_URL}/ka/account`, { timeout: 10_000 });
    });
  } finally {
    await deleteUserByEmail(email);
  }
});
