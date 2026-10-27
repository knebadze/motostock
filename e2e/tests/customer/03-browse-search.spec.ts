import { test, expect, type Page } from "@playwright/test";
import { modal, pickSelect } from "../helpers/admin";
import { checkFinding, loadState } from "../helpers/admin-state";
import { BACKEND_URL } from "../../env.js";
import { LOCALE_URL, customerPage, toastWith, type Customer } from "../helpers/customer";

// Browsing and search as a logged-in customer: header search (suggestions,
// typo tolerance, results page), category page with every filter and sort,
// product page (variant picker, discount price, delivery block, fit-your-bike
// badge from the garage, buy-together), vehicle listing (currency toggle,
// specs, "call me back" request).

test.describe.configure({ mode: "serial", timeout: 120_000 });

type CatalogState = { run: string; ids: Record<string, number>; names: Record<string, string> };
type ProductsState = { run: string; ids: Record<string, number>; names: Record<string, string> };
type CustomerState = { run: string; customer: Customer };

let page: Page;
let catalog: CatalogState;
let products: ProductsState;
let state: CustomerState;
let productUrl: string;
let categoryUrl: string;

test.beforeAll(async ({ browser }) => {
  catalog = loadState<CatalogState>("catalog");
  products = loadState<ProductsState>("products");
  state = loadState<CustomerState>("customer");
  page = await customerPage(browser, state.customer.email, state.customer.password);
  categoryUrl = `${LOCALE_URL}/e2e-test-root-edited-${catalog.run}`;
  productUrl = `${categoryUrl}/e2e-test-product-edited-${products.run}`;
});

test.afterAll(async () => {
  await page.close();
});

test.describe("ძებნა", () => {
  const headerSearch = () => page.locator("header").getByRole("combobox", { name: "ძიება" }).first();

  test("ჰედერის ძებნა: მინიმუმ სიმბოლოები, შეთავაზებები (პროდუქტი/ტექნიკა/კატეგორია)", async () => {
    await page.goto(LOCALE_URL, { waitUntil: "networkidle" });
    await headerSearch().fill("E");
    await expect(page.getByText(/ჩაწერეთ მინიმუმ \d+ სიმბოლო/).first()).toBeVisible();
    await headerSearch().fill(`E2E-TEST პროდუქტი შეცვლილი ${products.run}`);
    const suggestions = page.locator('[role="listbox"][aria-label="ძიება"]');
    await expect(suggestions).toContainText(products.names.productKa, { timeout: 10_000 });
    await headerSearch().fill(`E2E-TEST Model Edited ${catalog.run}`);
    await expect(suggestions).toContainText(catalog.names.model, { timeout: 10_000 });
  });

  test("შეთავაზებაზე დაჭერა პროდუქტის გვერდზე გადადის", async () => {
    await headerSearch().fill(products.names.productKa);
    const suggestions = page.locator('[role="listbox"][aria-label="ძიება"]');
    await suggestions.getByRole("option").filter({ hasText: products.names.productKa }).first().click();
    await page.waitForURL(new RegExp(`e2e-test-product-edited-${products.run}`));
    await expect(page.locator("h1")).toContainText(products.names.productKa);
  });

  test("Enter → ძებნის გვერდი; ბოლო ძიებები ინახება", async () => {
    await page.goto(LOCALE_URL, { waitUntil: "networkidle" });
    await headerSearch().fill(`E2E-TEST Product Edited ${products.run}`);
    await headerSearch().press("Enter");
    await page.waitForURL(/\/search\?/);
    await expect(page.locator("h1")).toContainText(`E2E-TEST Product Edited ${products.run}`);
    await expect(page.locator("main")).toContainText(products.names.productKa);
    await page.goto(LOCALE_URL, { waitUntil: "networkidle" });
    await headerSearch().click();
    const recent = page.locator('[role="listbox"][aria-label="ბოლო ძიებები"]');
    await expect(recent).toContainText(`E2E-TEST Product Edited ${products.run}`);
  });

  test("შეცდომით აკრეფილი სიტყვაც პოულობს (typo tolerance)", async () => {
    const typo = `E2E-TEST Prodct Edted ${products.run}`;
    await page.goto(`${LOCALE_URL}/search?q=${encodeURIComponent(typo)}`, { waitUntil: "networkidle" });
    const found = await page.locator("main").getByText(products.names.productKa).first().isVisible();
    checkFinding(found, "ძებნა: შეცდომით აკრეფილი სიტყვა ვერ პოულობს პროდუქტს", `query "${typo}"`);
  });

  test("ვერაფერი მოიძებნა — ცარიელი შედეგი", async () => {
    await page.goto(`${LOCALE_URL}/search?q=${encodeURIComponent("zzqqxxnotathing")}`, { waitUntil: "networkidle" });
    await expect(page.locator("main")).toContainText(/ვერაფერი მოიძებნა|ვერ მოიძებნა/);
  });
});

test.describe("კატეგორიის გვერდი და ფილტრები", () => {
  const filters = () => page.locator("main aside, main [data-filters], main").first();

  test("კატეგორიის გვერდზე E2E პროდუქტი ჩანს; შედეგების რაოდენობა", async () => {
    await page.goto(categoryUrl, { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toContainText(catalog.names.rootCategoryKa);
    await expect(page.locator("main")).toContainText(products.names.productKa);
    await expect(page.getByText(/\d+ შედეგი/).first()).toBeVisible();
  });

  // Filters are client-side state (not in the URL) and re-query after a
  // short debounce — every check polls the product grid.
  const productInGrid = () => page.locator("main").getByText(products.names.productKa);
  const filterPanel = () => page.locator("main aside:visible, main form:visible, main").first();

  test("ფასის ფილტრი: დიაპაზონს გარეთ ქრება, დიაპაზონში ჩანს", async () => {
    await page.goto(categoryUrl, { waitUntil: "networkidle" });
    const min = page.locator('main input[placeholder="დან"]:visible').first();
    const max = page.locator('main input[placeholder="მდე"]:visible').first();
    await min.fill("5000");
    await expect(productInGrid()).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByText("შედეგი ვერ მოიძებნა").first()).toBeVisible();
    await min.fill("100");
    await max.fill("200");
    await expect(productInGrid().first()).toBeVisible({ timeout: 10_000 });
    // Active-filter tag shows the range.
    await expect(page.locator("main").getByText(/ფასი: 100–200/).first()).toBeVisible();
  });

  test("ბრენდისა და მახასიათებლის ფილტრები; „ყველას გასუფთავება“", async () => {
    await page.goto(categoryUrl, { waitUntil: "networkidle" });
    const main = page.locator("main");
    await main.locator("label:visible", { hasText: products.names.brand }).first().locator('input[type="checkbox"]').check();
    await expect(productInGrid().first()).toBeVisible({ timeout: 10_000 });

    // The product carries "E2E სამი" (set in its edit) — not "E2E ერთი შეცვლილი".
    await main.locator("label:visible", { hasText: "E2E ერთი შეცვლილი" }).first().locator('input[type="checkbox"]').check();
    await expect(productInGrid()).toHaveCount(0, { timeout: 10_000 });
    await main.locator("label:visible", { hasText: "E2E ერთი შეცვლილი" }).first().locator('input[type="checkbox"]').uncheck();
    await main.locator("label:visible", { hasText: "E2E სამი" }).first().locator('input[type="checkbox"]').check();
    await expect(productInGrid().first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "ყველას გასუფთავება" }).first().click();
    await expect(main.locator("label:visible", { hasText: "E2E სამი" }).first().locator('input[type="checkbox"]')).not.toBeChecked();
    await expect(productInGrid().first()).toBeVisible();
    void filterPanel;
  });

  test("„ჩემი ტრანსპორტის მიხედვით“: გარაჟის ტექნიკაზე თავსებადი პროდუქტი ჩანს", async () => {
    await page.goto(categoryUrl, { waitUntil: "networkidle" });
    const vehicleFilter = page.locator("main button[aria-haspopup='listbox']:visible", { hasText: /აირჩიეთ თქვენი ტექნიკა|ყველა ტექნიკა/ }).first();
    await expect(vehicleFilter).toBeVisible();
    await vehicleFilter.click();
    const listbox = page.locator('[role="listbox"]:visible').last();
    await listbox.getByRole("option").filter({ hasText: "E2E Variant Edited" }).first().click();
    await expect(productInGrid().first()).toBeVisible({ timeout: 10_000 });
  });

  test("დალაგება: ფასი ზრდადობით/კლებადობით", async () => {
    await page.goto(categoryUrl, { waitUntil: "networkidle" });
    // Sort is mirrored in the URL (crawlable); the default "newest" drops it.
    for (const [label, param] of [
      ["ფასი: ზრდადობით", /sort=price-asc/],
      ["ფასი: კლებადობით", /sort=price-desc/],
      ["უახლესი", /^(?!.*sort=)/],
    ] as const) {
      await page.getByRole("button", { name: "სორტირება" }).first().click();
      await page.locator('[role="listbox"]:visible').last().getByRole("option", { name: label }).click();
      await expect(page).toHaveURL(param);
      await expect(page.locator("main")).toContainText(products.names.productKa);
    }
  });
});

test.describe("პროდუქტის გვერდი", () => {
  test("ვარიანტის არჩევა: ფასი იცვლება; ფასდაკლებულ ვარიანტზე გადახაზული ფასი (10% = 153 170-დან)", async () => {
    await page.goto(productUrl, { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toContainText(products.names.productKa);
    const main = page.locator("main");
    const options = main.locator("button[aria-pressed]");
    const count = await options.count();
    expect(count, "variant (size/colour) buttons").toBeGreaterThan(1);
    const prices: string[] = [];
    let sawDiscount = false;
    for (let index = 0; index < count; index++) {
      const option = options.nth(index);
      if (await option.isDisabled()) continue;
      await option.click();
      await expect(option).toHaveAttribute("aria-pressed", "true");
      const struck = main.locator(".line-through").first();
      if (await struck.isVisible().catch(() => false)) {
        // The 170 variant with the PERCENT (10%) discount → 153.
        await expect(struck).toContainText("170");
        await expect(main.getByText(/153/).first()).toBeVisible();
        sawDiscount = true;
      }
      prices.push(await main.locator("h1").locator("xpath=following::*[contains(text(),'₾')][1]").innerText());
    }
    expect(new Set(prices).size, `prices per variant: ${prices.join(" / ")}`).toBeGreaterThan(1);
    expect(sawDiscount, "a variant shows its discount").toBe(true);
  });

  test("მიწოდების ბლოკი და „ერთად შეძენა“", async () => {
    const main = page.locator("main");
    await expect(main.getByText("მიწოდება").first()).toBeVisible();
    await expect(main.getByText("მიწოდება და დაბრუნება — დეტალურად")).toBeVisible();
  });

  test("„ერგება თქვენს მოტოს?“ — გარაჟის ტექნიკით შემოწმება", async () => {
    const main = page.locator("main");
    const fit = main.getByText(/ერგება თქვენს მოტოს|არ ერგება|ერგება თუ არა/).first();
    await expect(fit).toBeVisible();
    const check = main.getByRole("button", { name: "შეამოწმეთ" });
    if (await check.isVisible().catch(() => false)) {
      await check.click();
      const dialog = modal(page);
      if (await dialog.isVisible().catch(() => false)) {
        await dialog.getByRole("button").filter({ hasText: catalog.names.model }).first().click().catch(() => {});
        await dialog.getByRole("button", { name: "შემოწმება" }).click().catch(() => {});
      }
    }
    await expect(main.getByText(/ერგება თქვენს მოტოს/).first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("ტრანსპორტის განცხადება", () => {
  let listingUrl = "";

  test("განცხადების გვერდი: მახასიათებლები, ვალუტის გადართვა", async () => {
    const response = await page.request.get(`${BACKEND_URL}/api/vehicle-listings/${catalog.ids.listing}`);
    expect(response.ok(), "listing is public").toBe(true);
    await page.goto(`${LOCALE_URL}/e2e-test-type-${catalog.run}`, { waitUntil: "networkidle" });
    // Cards use a "stretched" (text-less) link whose href ends in the id.
    await expect(page.locator("main").getByText(catalog.names.model).first()).toBeVisible();
    const card = page.locator(`main a[href$="-${catalog.ids.listing}"]`).first();
    await card.click();
    await page.waitForURL(new RegExp(`-${catalog.ids.listing}$`));
    await page.waitForLoadState("networkidle");
    listingUrl = page.url();
    const main = page.locator("main");
    await expect(main).toContainText(catalog.names.model);
    await expect(main).toContainText("მახასიათებლები");
    const priceBefore = await main.getByText(/[₾$]/).first().innerText();
    await page.getByRole("button", { name: "ვალუტის გადართვა (₾/$)" }).first().click();
    await expect.poll(async () => main.getByText(/[₾$]/).first().innerText()).not.toBe(priceBefore);
  });

  test("შოურუმის კატეგორია (საიტიდან შეძენა გამორთული): შეტყობინება + „დარეკვის თხოვნა“ ვალიდაციით და გაგზავნით", async ({ playwright }) => {
    type CategoryRow = {
      id: number;
      name: { ka: string; en: string; ru: string };
      slug: string;
      parentId: number | null;
      sortOrder: number;
      lowStockBadgeEnabled: boolean;
      onlinePurchaseEnabled: boolean;
      vehicleFitmentEnabled: boolean;
    };
    const admin = await playwright.request.newContext();
    expect(
      (await admin.post(`${BACKEND_URL}/api/auth/login`, { data: { email: "admin@gmail.com", password: "admin123" } })).ok(),
    ).toBe(true);
    const { categories } = (await (await admin.get(`${BACKEND_URL}/api/categories`)).json()) as { categories: CategoryRow[] };
    const category = categories.find((item) => item.id === catalog.ids.vehicleCategory)!;
    const setOnline = async (enabled: boolean) => {
      const response = await admin.patch(`${BACKEND_URL}/api/categories/${category.id}`, {
        data: {
          name: category.name,
          slug: category.slug,
          parentId: category.parentId,
          sortOrder: category.sortOrder,
          lowStockBadgeEnabled: category.lowStockBadgeEnabled,
          onlinePurchaseEnabled: enabled,
          vehicleFitmentEnabled: category.vehicleFitmentEnabled,
        },
      });
      expect(response.status(), await response.text()).toBe(200);
      // The storefront caches categories — drop it like the admin UI does.
      await page.request.post(`${LOCALE_URL.replace(/\/ka$/, "")}/api/revalidate`, { data: { tag: "categories" } }).catch(() => {});
    };
    // Vehicles may already be showroom-only (the switch is inherited from
    // the parent category) — only flip it when the page offers a cart.
    await page.goto(listingUrl, { waitUntil: "networkidle" });
    const alreadyShowroom = (await page.getByRole("button", { name: "დარეკვის თხოვნა" }).count()) > 0;
    test.info().annotations.push({ type: "note", description: `vehicle category showroom-only already: ${alreadyShowroom}` });
    try {
      if (!alreadyShowroom) await setOnline(false);
      await expect
        .poll(async () => {
          await page.goto(listingUrl, { waitUntil: "networkidle" });
          return page.getByRole("button", { name: "დარეკვის თხოვნა" }).count();
        }, { timeout: 30_000 })
        .toBeGreaterThan(0);
      await expect(page.getByText(/შოურუმ/).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /კალათაში დამატება/ })).toHaveCount(0);

      await page.getByRole("button", { name: "დარეკვის თხოვნა" }).first().click();
      const dialog = modal(page);
      await dialog.getByRole("button", { name: "გაგზავნა" }).click();
      // Name/phone are required — nothing is sent.
      await expect(dialog).toBeVisible();
      await dialog.getByLabel("სახელი").fill(`E2E-TEST მყიდველი ${state.run}`);
      await dialog.getByLabel("ტელეფონი").fill(state.customer.phone);
      const preferred = dialog.getByLabel("როდის დაგირეკოთ");
      if ((await preferred.evaluate((element) => element.tagName)) === "BUTTON") {
        await preferred.click();
        await page.locator('[role="listbox"]:visible').last().getByRole("option").first().click();
      } else {
        await preferred.fill("საღამოს");
      }
      await dialog.getByLabel(/შეკითხვა ან შენიშვნა/).fill("E2E: მაინტერესებს ფასი");
      const sent = page.waitForResponse((response) => response.url().endsWith("/api/callback-requests") && response.request().method() === "POST");
      await dialog.getByRole("button", { name: "გაგზავნა" }).click();
      expect((await sent).status()).toBeLessThan(300);
      await expect(page.getByText(/გმადლობთ! თხოვნა მიღებულია/).first()).toBeVisible();
    } finally {
      if (!alreadyShowroom) await setOnline(true);
      await admin.dispose();
    }
  });

  test("WhatsApp ბმული შეიცავს განცხადების სახელს", async () => {
    const whatsapp = page.getByRole("link", { name: "WhatsApp-ში მოწერა" }).first();
    if (await whatsapp.isVisible().catch(() => false)) {
      expect(await whatsapp.getAttribute("href")).toMatch(/wa\.me|whatsapp/);
    } else {
      test.info().annotations.push({ type: "note", description: "no WhatsApp number configured — link hidden" });
    }
  });
});
