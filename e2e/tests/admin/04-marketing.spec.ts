import { test, expect, type Locator, type Page } from "@playwright/test";
import { loginAsAdmin } from "../helpers/auth";
import {
  apiGet,
  modal,
  openTab,
  pickDate,
  pickSelect,
  pickSelectByLabel,
  submitModal,
  tableRow,
  testPng,
  waitForApi,
} from "../helpers/admin";
import { e2eRun, entityOf, loadState, saveState } from "../helpers/admin-state";

// Filters & discounts group, create + edit: shop filters per category
// (product + vehicle), promo codes (both domains), bulk discounts with an
// event (products) and without (vehicle listings), event edit. The
// buy-together / compatibility admin pages are read-only overviews of links
// made in the product form — only checked to show this run's product.

test.describe.configure({ mode: "serial", timeout: 180_000 });

type CatalogState = { ids: Record<string, number>; names: Record<string, string> };
type ProductsState = {
  run: string;
  ids: Record<string, number>;
  attributeIds: Record<string, number>;
  names: Record<string, string>;
};

const run = e2eRun();
const RUN = run.toUpperCase();
let page: Page;
let catalog: CatalogState;
let products: ProductsState;
const ids: Record<string, number> = {};

test.beforeAll(async ({ browser }) => {
  catalog = loadState<CatalogState>("catalog");
  products = loadState<ProductsState>("products");
  page = await browser.newPage();
  await loginAsAdmin(page);
});

test.afterAll(async () => {
  saveState("marketing", { run, ids });
  await page.close();
});

async function addFilter(typeTriggerId: string, typeLabel: string, extra?: () => Promise<void>) {
  await pickSelect(page, typeTriggerId, typeLabel);
  await extra?.();
  const created = waitForApi(page, "POST", /\/api\/(vehicle-)?category-filters$/);
  await page.getByRole("button", { name: "+ ფილტრის დამატება" }).click();
  const response = await created;
  expect(response.status(), await response.text()).toBeLessThan(300);
  return entityOf(await response.json()).id;
}

// Each filter row has a sortOrder number input saved on blur.
async function editSortOrder(rowText: string, value: string, endpoint: RegExp) {
  const input = tableRow(page, rowText).locator('input[type="number"]');
  await input.fill(value);
  const saved = waitForApi(page, "PATCH", endpoint);
  await input.blur();
  expect((await saved).status()).toBe(200);
}

test.describe("შოპის ფილტრები", () => {
  type Filter = { id: number; filterType: string; sortOrder: number; attribute?: { id: number } | null };

  test("პროდუქტის კატეგორიის ფილტრები: ფასი, ბრენდი, ჩემი ტრანსპორტი, მახასიათებელი + დალაგების რედაქტირება", async () => {
    await page.goto("/admin/category-filters");
    await pickSelectByLabel(page, "კატეგორია", catalog.names.rootCategoryKa);
    await addFilter("category-filter-new-type", "ფასი");
    await addFilter("category-filter-new-type", "ბრენდი");
    await addFilter("category-filter-new-type", "ჩემი ტრანსპორტის მიხედვით");
    ids.attributeFilter = await addFilter("category-filter-new-type", "მახასიათებელი", async () => {
      await pickSelect(page, "category-filter-new-attribute", `E2E-TEST SELECT ${products.run}`);
    });

    let { items } = await apiGet<{ items: Filter[] }>(page, `/category-filters?categoryId=${catalog.ids.rootCategory}`);
    expect(items.map((item) => item.filterType).sort()).toEqual(["ATTRIBUTE", "BRAND", "MY_VEHICLE", "PRICE"]);
    expect(items.find((item) => item.filterType === "ATTRIBUTE")?.attribute?.id).toBe(products.attributeIds.select);

    await editSortOrder("ფასი", "77", /\/api\/category-filters\/\d+$/);
    ({ items } = await apiGet<{ items: Filter[] }>(page, `/category-filters?categoryId=${catalog.ids.rootCategory}`));
    expect(items.find((item) => item.filterType === "PRICE")?.sortOrder).toBe(77);
  });

  test("ტრანსპორტის კატეგორიის ფილტრები: ფასი, წელი, ბრენდი, ტექნ. მახასიათებელი + დალაგება", async () => {
    await page.goto("/admin/vehicle-category-filters");
    await pickSelectByLabel(page, "ტრანსპორტის კატეგორია", `— ${catalog.names.vehicleCategoryKa}`);
    await addFilter("vehicle-category-filter-new-type", "ფასი");
    await addFilter("vehicle-category-filter-new-type", "წელი");
    await addFilter("vehicle-category-filter-new-type", "ბრენდი");
    await addFilter("vehicle-category-filter-new-type", "ტექნიკური მახასიათებელი", async () => {
      await pickSelect(page, "vehicle-category-filter-new-spec", 0);
    });
    let { items } = await apiGet<{ items: Filter[] }>(
      page,
      `/vehicle-category-filters?categoryId=${catalog.ids.vehicleCategory}`,
    );
    expect(items.map((item) => item.filterType).sort()).toEqual(["BRAND", "PRICE", "SPEC", "YEAR"]);
    await editSortOrder("წელი", "55", /\/api\/vehicle-category-filters\/\d+$/);
    ({ items } = await apiGet<{ items: Filter[] }>(
      page,
      `/vehicle-category-filters?categoryId=${catalog.ids.vehicleCategory}`,
    ));
    expect(items.find((item) => item.filterType === "YEAR")?.sortOrder).toBe(55);
  });
});

test.describe("პრომოკოდები", () => {
  type PromoCode = Record<string, unknown> & { id: number; code: string };

  async function getPromo(domain: "PRODUCT" | "VEHICLE", id: number): Promise<PromoCode> {
    const { items } = await apiGet<{ items: PromoCode[] }>(page, `/promo-codes?domain=${domain}`);
    const promo = items.find((item) => item.id === id);
    expect(promo, `promo ${id}`).toBeTruthy();
    return promo!;
  }

  function promoFields(dialog: Locator) {
    return {
      code: dialog.getByPlaceholder("მაგ. SUMMER15"),
      percent: dialog.locator('input[type="number"][max="99"]'),
      usageLimit: dialog.getByPlaceholder("ულიმიტო"),
      dates: () => dialog.getByRole("button", { name: "აირჩიეთ თარიღი" }).first(),
    };
  }

  test("პროდუქტის პრომოკოდი — კატეგორია, ბრენდი, მახასიათებელი+მნიშვნელობა, %, თარიღები, ლიმიტი; რედაქტირება", async () => {
    await page.goto("/admin/promo-codes");
    await page.getByRole("button", { name: "+ კოდის დამატება" }).first().click();
    let dialog = modal(page);
    let fields = promoFields(dialog);
    await fields.code.fill(`e2e${RUN}`);
    await pickSelect(page, "promo-category", catalog.names.rootCategoryKa);
    await pickSelect(page, "promo-product-brand", products.names.brand);
    await pickSelect(page, "promo-attribute", `E2E-TEST SELECT ${products.run}`);
    await pickSelect(page, "promo-attribute-value", 0);
    await fields.percent.fill("15");
    await pickDate(page, fields.dates(), "today");
    await pickDate(page, fields.dates(), { monthsAhead: 1, day: 20 });
    await fields.usageLimit.fill("50");
    // New codes default to active (the toggle has no accessible name).
    await expect(dialog.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    const created = waitForApi(page, "POST", /\/api\/promo-codes$/);
    await submitModal(page);
    ids.productPromo = entityOf(await (await created).json()).id;
    let promo = await getPromo("PRODUCT", ids.productPromo);
    expect(promo).toMatchObject({ code: `E2E${RUN}`, discountPercent: 15, usageLimit: 50, isActive: true });
    expect(JSON.stringify(promo)).toContain(products.names.brand);

    await tableRow(page, `E2E${RUN}`).getByRole("button", { name: "რედაქტირება" }).click();
    dialog = modal(page);
    fields = promoFields(dialog);
    await expect(fields.code).toHaveValue(`E2E${RUN}`, { ignoreCase: true });
    await fields.code.fill(`e2e${RUN}ed`);
    await fields.percent.fill("20");
    await fields.usageLimit.fill("");
    await dialog.getByRole("switch").click();
    await submitModal(page);
    promo = await getPromo("PRODUCT", ids.productPromo);
    expect(promo).toMatchObject({ code: `E2E${RUN}ED`, discountPercent: 20, usageLimit: null, isActive: false });
  });

  test("ტრანსპორტის პრომოკოდი — კატეგორია, მარკა, მოდელი, სპეც. მახასიათებელი; რედაქტირება", async () => {
    await page.goto("/admin/promo-codes");
    await openTab(page.locator("main"), "ტრანსპორტი");
    await page.locator("button:visible", { hasText: "+ კოდის დამატება" }).click();
    let dialog = modal(page);
    const fields = promoFields(dialog);
    await fields.code.fill(`e2ev${RUN}`);
    await pickSelect(page, "promo-category", `— ${catalog.names.vehicleCategoryKa}`);
    await pickSelect(page, "promo-vehicle-brand", catalog.names.brand);
    await pickSelect(page, "promo-vehicle-model", catalog.names.model);
    await pickSelect(page, "promo-spec-field", 0);
    await pickSelect(page, "promo-spec-value", 0);
    await fields.percent.fill("5");
    await pickDate(page, fields.dates(), "today");
    await pickDate(page, fields.dates(), { monthsAhead: 2, day: 10 });
    const created = waitForApi(page, "POST", /\/api\/promo-codes$/);
    await submitModal(page);
    ids.vehiclePromo = entityOf(await (await created).json()).id;
    let promo = await getPromo("VEHICLE", ids.vehiclePromo);
    expect(promo).toMatchObject({ code: `E2EV${RUN}`, discountPercent: 5, domain: "VEHICLE" });
    expect(JSON.stringify(promo)).toContain(catalog.names.model);

    await tableRow(page, `E2EV${RUN}`).getByRole("button", { name: "რედაქტირება" }).click();
    dialog = modal(page);
    await pickSelect(page, "promo-vehicle-model", 0);
    await promoFields(dialog).percent.fill("7.5");
    await submitModal(page);
    promo = await getPromo("VEHICLE", ids.vehiclePromo);
    expect(promo.discountPercent).toBe(7.5);
  });
});

test.describe("მასობრივი ფასდაკლებები", () => {
  test("პროდუქტები: E2E პროდუქტის ვარიანტებზე ფასდაკლება ივენთით (სახელი/აღწერა 3 ენაზე, სურათი)", async () => {
    await page.goto("/admin/bulk-discounts");
    const panel = page.locator("main");
    await pickSelectByLabel(page, "კატეგორია", catalog.names.rootCategoryKa);
    const search = panel.locator('input[placeholder^="ძებნა სახელით"]:visible');
    await search.fill(products.names.productKa);
    await search.press("Enter");
    await expect(panel.locator("table tbody tr:visible").first()).toContainText(products.names.productKa);
    await panel.locator("button:visible", { hasText: "ხილულის მონიშვნა" }).click();

    await panel.locator('[role="switch"][aria-label="შექმენი ივენთად"]:visible').click();
    for (const [locale, suffix] of [
      ["ქართულად", "ka"],
      ["ინგლისურად", "en"],
      ["რუსულად", "ru"],
    ]) {
      await panel.locator(`div:has(> label:text-is("სახელი (${locale}) *")) > input:visible`).fill(`E2E-TEST ივენთი ${suffix} ${run}`);
      await panel
        .locator(`div:has(> label:text-is("აღწერა (${locale})")) > :is(input, textarea):visible`)
        .fill(`E2E ივენთის აღწერა ${suffix}`);
    }
    await panel.locator('input[type="file"]:visible').first().setInputFiles(testPng("event.png"));
    // Far enough ahead not to overlap the product group's variant discounts.
    await panel.locator('div:has(> label:text-is("ფასდაკლება (%) *")) > input:visible').fill("12");
    await pickDate(page, panel.locator('div:has(> label:text-is("დაწყება *")):visible').getByRole("button"), {
      monthsAhead: 4,
      day: 1,
    });
    await pickDate(page, panel.locator('div:has(> label:text-is("დასრულება *")):visible').getByRole("button"), {
      monthsAhead: 4,
      day: 25,
    });
    const applied = waitForApi(page, "POST", /\/api\/bulk-discounts\/apply$/);
    await panel.locator("button:visible", { hasText: /^გამოყენება \(\d+ ვარიანტზე\)$/ }).click();
    const response = await applied;
    expect(response.status(), await response.text()).toBeLessThan(300);
    const result = await response.json();
    expect(JSON.stringify(result)).toMatch(/created|applied|count/i);

    const { items: events } = await apiGet<{ items: { id: number; name?: Record<string, string>; nameKa?: string }[] }>(
      page,
      "/bulk-discount-events",
    );
    const event = events.find((item) => JSON.stringify(item).includes(`E2E-TEST ივენთი ka ${run}`));
    expect(event, "event created").toBeTruthy();
    ids.event = event!.id;
    const discounts = await apiGet<{ items: unknown[] }>(page, `/product-variants/${products.ids.variant}/discounts`);
    expect(discounts.items.length, "bulk discount added to the variant").toBe(4);
  });

  test("ივენთის რედაქტირება — სახელები, აღწერა, სურათი", async () => {
    await page.goto("/admin/bulk-discounts");
    await openTab(page.locator("main"), "ივენთები");
    const row = tableRow(page, `E2E-TEST ივენთი ka ${run}`);
    await row.getByRole("button", { name: "რედაქტირება" }).click();
    const dialog = modal(page);
    await dialog.locator('div:has(> label:text-is("სახელი (ქართულად) *")) > input').fill(`E2E-TEST ივენთი შეცვლილი ${run}`);
    await dialog.locator('div:has(> label:text-is("აღწერა (ინგლისურად)")) > :is(input, textarea)').fill("E2E event edited");
    await dialog.locator('input[type="file"]').setInputFiles(testPng("event2.png", [0, 0, 120]));
    const updated = waitForApi(page, "PATCH", new RegExp(`/api/bulk-discount-events/${ids.event}$`));
    await submitModal(page);
    expect((await updated).status()).toBe(200);
    const { items: events } = await apiGet<{ items: unknown[] }>(page, "/bulk-discount-events");
    const event = JSON.stringify(events.find((item) => (item as { id: number }).id === ids.event));
    expect(event).toContain(`E2E-TEST ივენთი შეცვლილი ${run}`);
    expect(event).toContain("E2E event edited");
  });

  test("ტრანსპორტი: E2E განცხადებაზე ფასდაკლება (ივენთის გარეშე)", async () => {
    await page.goto("/admin/bulk-discounts");
    await openTab(page.locator("main"), "ტრანსპორტი");
    await pickSelectByLabel(page, "ტრანსპორტის კატეგორია", `— ${catalog.names.vehicleCategoryKa}`);
    const panel = page.locator("main");
    await expect(panel.locator("table tbody tr:visible").first()).toContainText(catalog.names.model);
    await panel.locator("button:visible", { hasText: "ხილულის მონიშვნა" }).click();
    await panel.locator('div:has(> label:text-is("ფასდაკლება (%) *")) > input:visible').fill("4");
    await pickDate(page, panel.locator('div:has(> label:text-is("დაწყება *")):visible').getByRole("button"), {
      monthsAhead: 5,
      day: 1,
    });
    await pickDate(page, panel.locator('div:has(> label:text-is("დასრულება *")):visible').getByRole("button"), {
      monthsAhead: 5,
      day: 20,
    });
    const applied = waitForApi(page, "POST", /\/api\/bulk-discounts\/apply$/);
    await panel.locator("button:visible", { hasText: /^გამოყენება \(\d+ განცხადებაზე\)$/ }).click();
    const response = await applied;
    expect(response.status(), await response.text()).toBeLessThan(300);
    const discounts = await apiGet<{ items: unknown[] }>(page, `/vehicle-listings/${catalog.ids.listing}/discounts`);
    // One added in the catalog group's listing edit, plus this bulk one.
    expect(discounts.items.length).toBe(2);
  });
});

test.describe("მიმოხილვის გვერდები", () => {
  test("„ერთად შეძენა“ და „თავსებადობა“ გვერდებზე E2E პროდუქტი ჩანს", async () => {
    await page.goto("/admin/buy-together");
    await page.getByPlaceholder("პროდუქტის სახელი").fill(products.names.productKa);
    await page.getByPlaceholder("პროდუქტის სახელი").press("Enter");
    await expect(page.locator("main").getByText(products.names.productKa).first()).toBeVisible();

    await page.goto("/admin/compatibility");
    await page.getByPlaceholder("პროდუქტის სახელი").fill(products.names.productKa);
    await page.getByPlaceholder("პროდუქტის სახელი").press("Enter");
    await expect(page.locator("main").getByText(products.names.productKa).first()).toBeVisible();
  });
});
