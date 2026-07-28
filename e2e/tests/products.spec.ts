import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";
import { uniqueTestName } from "./helpers/fixtures";

test("create product with variant matrix + SEO autofill, then cascade-delete it", async ({ page }) => {
  await loginAsAdmin(page);

  const nameKa = uniqueTestName("პროდუქტი");
  const nameEn = uniqueTestName("Product");

  await page.goto("/admin/products/new", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/admin\/products\/new$/);
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);

  await page.click('button:has-text("აირჩიეთ კატეგორია")');
  await page.fill('input[placeholder="ძებნა..."]', "ჩაფხუტები").catch(() => {});
  await page.waitForTimeout(300);
  await page.getByRole("option", { name: "— ჩაფხუტები" }).first().click();
  await page.waitForTimeout(300);

  await page.fill("#product-name-ka", nameKa);
  await page.fill("#product-name-en", nameEn);
  await page.fill("#product-name-ru", uniqueTestName("Продукт"));

  await test.step("SEO tab: slug autofills from the English name", async () => {
    await page.click('button:has-text("SEO")');
    await page.waitForTimeout(300);
    const slugValue = await page.locator("#product-slug").inputValue();
    expect(slugValue.length).toBeGreaterThan(0);
  });

  await page.click('button:has-text("მახასიათებლები")');
  await page.waitForTimeout(500);
  await page.click(
    'label:has-text("სერტიფიკატი") + div button, label:has-text("სერტიფიკატი") ~ div button',
  );
  await page.waitForTimeout(300);
  await page.getByRole("option").first().click();

  await test.step("pricing tab: generate a 2-variant matrix (2 sizes)", async () => {
    await page.click('button:has-text("ფასი")');
    await page.waitForTimeout(400);
    await page.locator('label:has-text("ზომები") + div button').click();
    await page.waitForTimeout(300);
    const sizeOptions = page.locator('ul[role="listbox"] li button');
    await sizeOptions.nth(0).click();
    await sizeOptions.nth(1).click();
    await page.locator('h1:has-text("პროდუქტის დამატება")').click();
    await page.waitForTimeout(200);

    await page.locator('label:has-text("ფასი") + input').fill("99.99");
    await page.click('button:has-text("+ ვარიანტების გენერაცია")');
    await page.waitForTimeout(400);
    // Tabs.tsx keeps every panel mounted (just hidden), so an unscoped
    // "table tbody tr" selector also matches rows in other, invisible tabs.
    await expect(page.locator("table tbody tr:visible")).toHaveCount(2);
  });

  await page.click('form button:has-text("შენახვა")');
  await page.waitForURL("http://localhost:3000/admin/products", { timeout: 15_000 });

  const row = page.locator(`table tbody tr:has-text("${nameKa}")`);
  await expect(row).toHaveCount(1);
  await expect(row.locator("td").nth(6)).toContainText("2"); // variant count column

  await test.step("delete confirmation warns about the 2 variants, then cascade-deletes cleanly", async () => {
    await row.locator('button[aria-label="წაშლა"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('[role="dialog"]')).toContainText("2 ვარიანტი");

    await page.click('[role="dialog"] button:has-text("წაშლა")');
    await page.waitForTimeout(800);
    await expect(page.locator(`table tbody tr:has-text("${nameKa}")`)).toHaveCount(0);
  });
});
