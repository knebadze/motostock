import { test, expect } from "@playwright/test";
import { BASE_URL, BACKEND_URL } from "../env.js";

// Only checks that the buttons render and point at the right backend routes —
// not the actual Google/Facebook consent flow, which needs real provider
// credentials the user hasn't configured yet. Intentionally survives
// unconfigured vs. configured OAuth either way.
for (const route of ["login", "register"]) {
  test(`${route} page shows working Google/Facebook buttons`, async ({ page }) => {
    await page.goto(`${BASE_URL}/ka/${route}`, { waitUntil: "networkidle" });

    const googleLink = page.locator(`a[href="${BACKEND_URL}/api/auth/google"]`);
    const facebookLink = page.locator(`a[href="${BACKEND_URL}/api/auth/facebook"]`);

    await expect(googleLink).toBeVisible();
    await expect(facebookLink).toBeVisible();
  });
}
