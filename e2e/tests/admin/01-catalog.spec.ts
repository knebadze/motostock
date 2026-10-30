import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "../helpers/auth";
import {
  apiGet,
  clickRowAction,
  fillRichText,
  modal,
  openTab,
  pickSelect,
  pickDate,
  pickSelectByLabel,
  setSwitch,
  submitModal,
  tableRow,
  testPng,
  waitForApi,
} from "../helpers/admin";
import { checkFinding, e2eRun, entityOf, saveState } from "../helpers/admin-state";

// Admin catalog group, create + edit only (deletion is a separate, later
// phase that runs once every group's data exists). Entities depend on each
// other, so this runs serially in dependency order and shares one logged-in
// page: category → brand → model → vehicle catalog → vehicle listing.

test.describe.configure({ mode: "serial", timeout: 120_000 });

const run = e2eRun();
let page: Page;

const ids: Record<string, number> = {};
const names = {
  rootCategoryKa: `E2E-TEST მთავარი ${run}`,
  vehicleCategoryKa: `E2E-TEST ტიპი ${run}`,
  brand: `E2E-TEST Brand ${run}`,
  model: `E2E-TEST Model ${run}`,
};

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  await loginAsAdmin(page);
});

test.afterAll(async () => {
  saveState("catalog", { run, ids, names });
  await page.close();
});

type Category = {
  id: number;
  slug: string;
  name: { ka: string; en: string; ru: string };
  parentId: number | null;
  sortOrder: number;
  lowStockBadgeEnabled: boolean;
  onlinePurchaseEnabled: boolean;
  vehicleFitmentEnabled: boolean;
  imageUrl: string | null;
  bannerImageUrl: string | null;
  menuImageUrl: string | null;
};

async function getCategory(id: number): Promise<Category> {
  const { categories } = await apiGet<{ categories: Category[] }>(page, "/categories");
  const category = categories.find((item) => item.id === id);
  expect(category, `category ${id} exists`).toBeTruthy();
  return category!;
}

test.describe("კატეგორიები", () => {
  test("ახალი მთავარი კატეგორია — ყველა ველი + სამივე სურათი", async () => {
    await page.goto("/admin/categories");
    await page.getByRole("button", { name: "+ კატეგორიის დამატება" }).click();
    const dialog = modal(page);
    await dialog.locator("#category-name-ka").fill(names.rootCategoryKa);
    await dialog.locator("#category-name-en").fill(`E2E-TEST Root ${run}`);
    await dialog.locator("#category-name-ru").fill(`E2E-TEST Главная ${run}`);
    await expect(dialog.locator("#category-slug")).toHaveValue(`e2e-test-root-${run}`);
    await dialog.locator("#category-sort-order").fill("90");
    await setSwitch(dialog, "„დარჩა მხოლოდ N ცალი” ბეჯი", false);
    await setSwitch(dialog, "საიტიდან შეძენა", false);
    await setSwitch(dialog, "ტრანსპორტთან თავსებადობა", false);
    await dialog.locator("#category-image").setInputFiles(testPng("cat.png"));
    await dialog.locator("#category-banner-image").setInputFiles(testPng("banner.png", [30, 90, 200]));
    await dialog.locator("#category-menu-image").setInputFiles(testPng("menu.png", [30, 200, 90]));

    const created = waitForApi(page, "POST", /\/api\/categories$/);
    await submitModal(page);
    const response = await created;
    expect(response.status()).toBe(201);
    ids.rootCategory = entityOf(await response.json()).id;

    const saved = await getCategory(ids.rootCategory);
    expect(saved).toMatchObject({
      name: { ka: names.rootCategoryKa, en: `E2E-TEST Root ${run}`, ru: `E2E-TEST Главная ${run}` },
      slug: `e2e-test-root-${run}`,
      parentId: null,
      sortOrder: 90,
      lowStockBadgeEnabled: false,
      onlinePurchaseEnabled: false,
      vehicleFitmentEnabled: false,
    });
    expect(saved.imageUrl, "image uploaded").toBeTruthy();
    expect(saved.bannerImageUrl, "banner uploaded").toBeTruthy();
    expect(saved.menuImageUrl, "menu image uploaded").toBeTruthy();
    await expect(tableRow(page, names.rootCategoryKa)).toBeVisible();
  });

  test("მთავარი კატეგორიის რედაქტირება — ყველა ველის შეცვლა", async () => {
    await clickRowAction(page, names.rootCategoryKa, "რედაქტირება");
    const dialog = modal(page);
    await expect(dialog.locator("#category-name-ka")).toHaveValue(names.rootCategoryKa);
    names.rootCategoryKa = `E2E-TEST მთავარი შეცვლილი ${run}`;
    await dialog.locator("#category-name-ka").fill(names.rootCategoryKa);
    await dialog.locator("#category-name-en").fill(`E2E-TEST Root Edited ${run}`);
    await dialog.locator("#category-name-ru").fill(`E2E-TEST Главная изм ${run}`);
    // FINDING: on edit, typing a new English name silently regenerates the
    // stored slug (the category's public URL) — expected it to stay.
    const slugAfterRename = await dialog.locator("#category-slug").inputValue();
    checkFinding(
      slugAfterRename === `e2e-test-root-${run}`,
      "კატეგორიის რედაქტირება: EN სახელის შეცვლა slug-ს ცვლის",
      `slug became "${slugAfterRename}" without touching the slug field`,
    );
    await dialog.locator("#category-slug").fill(`e2e-test-root-edited-${run}`);
    await dialog.locator("#category-sort-order").fill("91");
    await setSwitch(dialog, "„დარჩა მხოლოდ N ცალი” ბეჯი", true);
    await setSwitch(dialog, "საიტიდან შეძენა", true);
    await setSwitch(dialog, "ტრანსპორტთან თავსებადობა", true);
    const before = await getCategory(ids.rootCategory);
    await dialog.locator("#category-image").setInputFiles(testPng("cat2.png", [10, 10, 10]));

    const updated = waitForApi(page, "PATCH", new RegExp(`/api/categories/${ids.rootCategory}$`));
    await submitModal(page);
    expect((await updated).status()).toBe(200);

    const saved = await getCategory(ids.rootCategory);
    expect(saved).toMatchObject({
      name: { ka: names.rootCategoryKa, en: `E2E-TEST Root Edited ${run}`, ru: `E2E-TEST Главная изм ${run}` },
      slug: `e2e-test-root-edited-${run}`,
      sortOrder: 91,
      lowStockBadgeEnabled: true,
      onlinePurchaseEnabled: true,
      vehicleFitmentEnabled: true,
    });
    expect(saved.imageUrl).not.toBe(before.imageUrl);
    expect(saved.bannerImageUrl, "untouched banner kept").toBe(before.bannerImageUrl);
    await expect(tableRow(page, names.rootCategoryKa)).toBeVisible();
  });

  test("ქვეკატეგორია „მოტოტექნიკის“ ქვეშ (ტრანსპორტის ტიპი მოდელებისთვის)", async () => {
    await page.getByRole("button", { name: "+ კატეგორიის დამატება" }).click();
    const dialog = modal(page);
    await dialog.locator("#category-name-ka").fill(names.vehicleCategoryKa);
    await dialog.locator("#category-name-en").fill(`E2E-TEST Type ${run}`);
    await dialog.locator("#category-name-ru").fill(`E2E-TEST Тип ${run}`);
    await pickSelect(page, "category-parent", "მოტოტექნიკა");
    // Menu image is only offered for top-level categories.
    await expect(dialog.locator("#category-menu-image")).toHaveCount(0);
    await dialog.locator("#category-image").setInputFiles(testPng("type.png"));

    const created = waitForApi(page, "POST", /\/api\/categories$/);
    await submitModal(page);
    ids.vehicleCategory = entityOf(await (await created).json()).id;
    const saved = await getCategory(ids.vehicleCategory);
    const { categories } = await apiGet<{ categories: Category[] }>(page, "/categories");
    const transport = categories.find((item) => item.slug === "transport")!;
    expect(saved.parentId).toBe(transport.id);
    expect(saved.slug).toBe(`e2e-test-type-${run}`);
    // New categories default to "last among siblings", not 0.
    expect(saved.sortOrder).toBeGreaterThan(0);
  });

  test("ქვეკატეგორიის რედაქტირება — სახელები", async () => {
    await clickRowAction(page, names.vehicleCategoryKa, "რედაქტირება");
    const dialog = modal(page);
    names.vehicleCategoryKa = `E2E-TEST ტიპი შეცვლილი ${run}`;
    await dialog.locator("#category-name-ka").fill(names.vehicleCategoryKa);
    await dialog.locator("#category-name-en").fill(`E2E-TEST Type Edited ${run}`);
    await dialog.locator("#category-name-ru").fill(`E2E-TEST Тип изм ${run}`);
    await submitModal(page);
    const saved = await getCategory(ids.vehicleCategory);
    expect(saved.name.ka).toBe(names.vehicleCategoryKa);
    expect(saved.name.en).toBe(`E2E-TEST Type Edited ${run}`);
  });
});

test.describe("მარკები", () => {
  type Brand = { id: number; name: string; slug: string; logoUrl: string | null };

  test("ახალი მარკა + ლოგო", async () => {
    await page.goto("/admin/brands");
    await page.getByRole("button", { name: "+ მარკის დამატება" }).click();
    const dialog = modal(page);
    await dialog.locator("#brand-name").fill(names.brand);
    await expect(dialog.locator("#brand-slug")).toHaveValue(`e2e-test-brand-${run}`);
    await dialog.locator("#brand-logo").setInputFiles(testPng("logo.png"));
    const created = waitForApi(page, "POST", /\/api\/brands$/);
    await submitModal(page);
    ids.brand = entityOf(await (await created).json()).id;
    const { brand } = await apiGet<{ brand: Brand }>(page, `/brands/${ids.brand}`);
    expect(brand).toMatchObject({ name: names.brand, slug: `e2e-test-brand-${run}` });
    expect(brand.logoUrl).toBeTruthy();
    await expect(tableRow(page, names.brand)).toBeVisible();
  });

  test("მარკის რედაქტირება — სახელი, slug, ლოგო", async () => {
    await clickRowAction(page, names.brand, "რედაქტირება");
    const dialog = modal(page);
    const { brand: before } = await apiGet<{ brand: Brand }>(page, `/brands/${ids.brand}`);
    names.brand = `E2E-TEST Brand Edited ${run}`;
    await dialog.locator("#brand-name").fill(names.brand);
    await dialog.locator("#brand-slug").fill(`e2e-test-brand-edited-${run}`);
    await dialog.locator("#brand-logo").setInputFiles(testPng("logo2.png", [0, 0, 200]));
    await submitModal(page);
    const { brand } = await apiGet<{ brand: Brand }>(page, `/brands/${ids.brand}`);
    expect(brand).toMatchObject({ name: names.brand, slug: `e2e-test-brand-edited-${run}` });
    expect(brand.logoUrl).not.toBe(before.logoUrl);
  });
});

test.describe("მოდელები", () => {
  type Model = { id: number; name: string; slug: string; brandId: number; categoryId: number };

  test("ახალი მოდელი — E2E მარკა + E2E ტიპი", async () => {
    await page.goto("/admin/models");
    await page.getByRole("button", { name: "+ მოდელის დამატება" }).click();
    const dialog = modal(page);
    await pickSelect(page, "model-brand", names.brand);
    await pickSelect(page, "model-category", `— ${names.vehicleCategoryKa}`);
    await dialog.locator("#model-name").fill(names.model);
    await expect(dialog.locator("#model-slug")).toHaveValue(`e2e-test-model-${run}`);
    const created = waitForApi(page, "POST", /\/api\/models$/);
    await submitModal(page);
    ids.model = entityOf(await (await created).json()).id;
    const { model } = await apiGet<{ model: Model }>(page, `/models/${ids.model}`);
    expect(model).toMatchObject({
      name: names.model,
      slug: `e2e-test-model-${run}`,
      brandId: ids.brand,
      categoryId: ids.vehicleCategory,
    });
    await expect(tableRow(page, names.model)).toBeVisible();
  });

  test("მოდელის რედაქტირება — სახელი და slug", async () => {
    await clickRowAction(page, names.model, "რედაქტირება");
    const dialog = modal(page);
    names.model = `E2E-TEST Model Edited ${run}`;
    await dialog.locator("#model-name").fill(names.model);
    await dialog.locator("#model-slug").fill(`e2e-test-model-edited-${run}`);
    await submitModal(page);
    const { model } = await apiGet<{ model: Model }>(page, `/models/${ids.model}`);
    expect(model).toMatchObject({ name: names.model, slug: `e2e-test-model-edited-${run}` });
  });
});

test.describe("ტექნიკის კატალოგი", () => {
  type Lookup = { id: number } | null;
  type Entry = Record<string, unknown> & {
    id: number;
    brand: { id: number };
    model: { id: number };
    category: { id: number };
    fuelType: Lookup;
    transmissionType: Lookup;
    coolingType: Lookup;
    finalDriveType: Lookup;
    driveType: Lookup;
    startType: Lookup;
    powertrainType: Lookup & { key?: string };
    imageUrl: string | null;
  };

  async function getEntry(id: number): Promise<Entry> {
    return entityOf(await apiGet(page, `/vehicle-catalog/${id}`)) as Entry;
  }

  async function fillCombustionSpecs(dialog: ReturnType<typeof modal>, values: Record<string, string>) {
    for (const [id, value] of Object.entries(values)) await dialog.locator(`#${id}`).fill(value);
  }

  test("ახალი ჩანაწერი (წვის ძრავი) — ყველა ველი, აღწერა 3 ენაზე, სურათი", async () => {
    await page.goto("/admin/vehicle-catalog");
    await page.getByRole("button", { name: "+ ტექნიკის დამატება" }).click();
    const dialog = modal(page);
    await pickSelect(page, "vc-category-filter", `— ${names.vehicleCategoryKa}`);
    await pickSelect(page, "vc-brand", names.brand);
    await pickSelect(page, "vc-model", names.model);
    await dialog.locator("#vc-variant").fill("E2E Variant");
    await pickSelect(page, "vc-powertrain-type", "წვის ძრავი");
    await fillCombustionSpecs(dialog, {
      "vc-year-from": "2020",
      "vc-year-to": "2024",
      "vc-engine-cc": "649",
      "vc-power-hp": "68",
      "vc-cylinders": "2",
      "vc-gears": "6",
      "vc-seats": "2",
      "vc-weight-kg": "193",
      "vc-seat-height": "790",
      "vc-top-speed": "200",
      "vc-fuel-tank": "15.5",
      "vc-oil-capacity": "3.4",
    });
    await dialog.getByLabel("ABS").check();
    await pickSelect(page, "vc-fuel-type", 0);
    await pickSelect(page, "vc-transmission-type", 0);
    await pickSelect(page, "vc-cooling-type", 0);
    await pickSelect(page, "vc-final-drive-type", 0);
    await pickSelect(page, "vc-drive-type", 0);
    await pickSelect(page, "vc-start-type", 0);
    await dialog.getByLabel("დიფერენციალის ბლოკირება").check();

    await openTab(dialog, "აღწერა");
    await fillRichText(dialog, 0, "E2E აღწერა ქართულად");
    await fillRichText(dialog, 1, "E2E description in English");
    await fillRichText(dialog, 2, "E2E описание на русском");
    await openTab(dialog, "სურათი");
    await dialog.locator("#vc-image").setInputFiles(testPng("vc.png"));

    const created = waitForApi(page, "POST", /\/api\/vehicle-catalog$/);
    await submitModal(page);
    ids.catalogEntry = entityOf(await (await created).json()).id;

    const entry = await getEntry(ids.catalogEntry);
    expect(entry).toMatchObject({
      variant: "E2E Variant",
      yearFrom: 2020,
      yearTo: 2024,
      engineVolumeCc: 649,
      enginePowerHp: 68,
      cylinderCount: 2,
      gearCount: 6,
      seatCount: 2,
      weightKg: 193,
      seatHeightMm: 790,
      topSpeedKmh: 200,
      fuelTankLiters: 15.5,
      oilCapacityLiters: 3.4,
      hasAbs: true,
      hasLockingDifferential: true,
    });
    expect(entry.brand.id).toBe(ids.brand);
    expect(entry.model.id).toBe(ids.model);
    expect(entry.category.id).toBe(ids.vehicleCategory);
    for (const lookup of ["fuelType", "transmissionType", "coolingType", "finalDriveType", "driveType", "startType"] as const) {
      expect(entry[lookup], `${lookup} saved`).not.toBeNull();
    }
    expect(String(entry.descriptionKa)).toContain("E2E აღწერა ქართულად");
    expect(String(entry.descriptionEn)).toContain("E2E description in English");
    expect(String(entry.descriptionRu)).toContain("E2E описание на русском");
    expect(entry.imageUrl, "image uploaded").toBeTruthy();
  });

  test("ჩანაწერის რედაქტირება — რიცხვები, lookup-ები, ჩეკბოქსები, აღწერა, სურათი", async () => {
    await clickRowAction(page, names.model, "რედაქტირება");
    const dialog = modal(page);
    const before = await getEntry(ids.catalogEntry);
    await expect(dialog.locator("#vc-engine-cc")).toHaveValue("649");
    await dialog.locator("#vc-variant").fill("E2E Variant Edited");
    await fillCombustionSpecs(dialog, {
      "vc-year-from": "2019",
      "vc-year-to": "2025",
      "vc-engine-cc": "690",
      "vc-power-hp": "73",
      "vc-cylinders": "1",
      "vc-gears": "5",
      "vc-seats": "1",
      "vc-weight-kg": "160",
      "vc-seat-height": "880",
      "vc-top-speed": "180",
      "vc-fuel-tank": "13",
      "vc-oil-capacity": "1.7",
    });
    await dialog.getByLabel("ABS").uncheck();
    await dialog.getByLabel("დიფერენციალის ბლოკირება").uncheck();
    await pickSelect(page, "vc-fuel-type", 1);
    await pickSelect(page, "vc-transmission-type", 1);
    await pickSelect(page, "vc-cooling-type", 1);
    await pickSelect(page, "vc-final-drive-type", 1);
    await pickSelect(page, "vc-drive-type", 1);
    await pickSelect(page, "vc-start-type", 1);
    await openTab(dialog, "აღწერა");
    await fillRichText(dialog, 0, "E2E აღწერა შეცვლილი");
    await fillRichText(dialog, 1, "E2E description edited");
    await fillRichText(dialog, 2, "E2E описание изменено");
    await openTab(dialog, "სურათი");
    await dialog.locator("#vc-image").setInputFiles(testPng("vc2.png", [0, 120, 0]));

    const updated = waitForApi(page, "PATCH", new RegExp(`/api/vehicle-catalog/${ids.catalogEntry}$`));
    await submitModal(page);
    expect((await updated).status()).toBe(200);

    const entry = await getEntry(ids.catalogEntry);
    expect(entry).toMatchObject({
      variant: "E2E Variant Edited",
      yearFrom: 2019,
      yearTo: 2025,
      engineVolumeCc: 690,
      enginePowerHp: 73,
      cylinderCount: 1,
      gearCount: 5,
      seatCount: 1,
      weightKg: 160,
      seatHeightMm: 880,
      topSpeedKmh: 180,
      fuelTankLiters: 13,
      oilCapacityLiters: 1.7,
      hasAbs: false,
      hasLockingDifferential: false,
    });
    for (const lookup of ["fuelType", "transmissionType", "coolingType", "finalDriveType", "driveType", "startType"] as const) {
      checkFinding(entry[lookup]?.id !== before[lookup]?.id, `ტექნიკა: ${lookup} არ შეიცვალა`, `still ${entry[lookup]?.id}`);
    }
    expect(String(entry.descriptionKa)).toContain("E2E აღწერა შეცვლილი");
    expect(String(entry.descriptionEn)).toContain("E2E description edited");
    expect(String(entry.descriptionRu)).toContain("E2E описание изменено");
    expect(entry.imageUrl).not.toBe(before.imageUrl);
  });

  test("ახალი ჩანაწერი (ელექტრო) — ელექტრო ველები", async () => {
    await page.getByRole("button", { name: "+ ტექნიკის დამატება" }).click();
    const dialog = modal(page);
    await pickSelect(page, "vc-brand", names.brand);
    await pickSelect(page, "vc-model", names.model);
    await dialog.locator("#vc-variant").fill("E2E Electric");
    await pickSelect(page, "vc-powertrain-type", "ელექტრო ძრავი");
    // Combustion-only fields disappear for an electric powertrain.
    await expect(dialog.locator("#vc-engine-cc")).toHaveCount(0);
    await expect(dialog.locator("#vc-fuel-tank")).toHaveCount(0);
    await dialog.locator("#vc-motor-watt").fill("5000");
    await dialog.locator("#vc-battery-wh").fill("4000");
    await dialog.locator("#vc-range-km").fill("120");
    await dialog.locator("#vc-charging-time").fill("240");
    await dialog.locator("#vc-year-from").fill("2023");
    const created = waitForApi(page, "POST", /\/api\/vehicle-catalog$/);
    await submitModal(page);
    ids.electricEntry = entityOf(await (await created).json()).id;
    const entry = await getEntry(ids.electricEntry);
    expect(entry).toMatchObject({
      variant: "E2E Electric",
      motorPowerWatt: 5000,
      batteryCapacityWh: 4000,
      rangeKm: 120,
      chargingTimeMinutes: 240,
      yearFrom: 2023,
    });
    expect(entry.powertrainType?.key).toBe("ELECTRIC");
  });

  test("ელექტრო → წვის ძრავზე გადართვა რედაქტირებისას (დამალული ველები)", async () => {
    // Edit the electric entry: switch to combustion, fill cc. The electric
    // fields are hidden but keep their state — check what gets persisted.
    await page.reload();
    // Both entries share the model; the list is newest-first.
    await tableRow(page, names.model).getByRole("button", { name: "რედაქტირება" }).click();
    const dialog = modal(page);
    await expect(dialog.locator("#vc-variant")).toHaveValue("E2E Electric");
    await pickSelect(page, "vc-powertrain-type", "წვის ძრავი");
    await dialog.locator("#vc-engine-cc").fill("125");
    await submitModal(page);
    const entry = await getEntry(ids.electricEntry);
    expect(entry.engineVolumeCc).toBe(125);
    expect(entry.powertrainType?.key).toBe("COMBUSTION");
    // Observation, not a hard failure: hidden electric specs stay stored.
    checkFinding(
      entry.motorPowerWatt == null && entry.batteryCapacityWh == null,
      "ტექნიკა: ელექტრო→წვის გადართვისას დამალული ელექტრო ველები DB-ში რჩება",
      `motorPowerWatt=${entry.motorPowerWatt}, batteryCapacityWh=${entry.batteryCapacityWh}, rangeKm=${entry.rangeKm}`,
    );
  });
});

test.describe("ტრანსპორტის განცხადებები", () => {
  type Listing = Record<string, unknown> & {
    id: number;
    vehicleCatalog: { id: number };
    condition: { id: number; key?: string };
    status: { id: number; key?: string };
    color: { id: number };
    images?: unknown[];
  };

  async function getListing(id: number): Promise<Listing> {
    return entityOf(await apiGet(page, `/vehicle-listings/${id}/detail`)) as Listing;
  }

  test("ახალი განცხადება — ყველა ველი, USD ფასი, 2 სურათი", async () => {
    await page.goto("/admin/vehicle-listings");
    await page.getByRole("button", { name: "+ განცხადების დამატება" }).click();
    const dialog = modal(page);
    await pickSelect(page, "vl-vehicle-catalog", `${names.brand} ${names.model} (2019–2025)`, {
      search: names.model,
    });
    await pickSelect(page, "vl-condition", "ახალი");
    await pickSelect(page, "vl-status", "ხელმისაწვდომია");
    await pickSelect(page, "vl-color", 0);
    await dialog.locator("#vl-year").fill("2024");
    await dialog.locator("#vl-price").fill("8500");
    await pickSelectByLabel(page, "ვალუტა", "$");
    await dialog.locator("#vl-stock").fill("3");
    await dialog.locator("#vl-mileage").fill("0");
    await dialog.locator("#vl-warranty-value").fill("2");
    await pickSelect(page, "vl-warranty-unit", "წელი");
    await setSwitch(dialog, "აქტიურია", true);
    await setSwitch(dialog, "ახალი პროდუქცია სლაიდერში", true);
    await setSwitch(dialog, "განბაჟებულია", true);
    await openTab(dialog, "აღწერა");
    await fillRichText(dialog, 0, "E2E განცხადება ქართულად");
    await fillRichText(dialog, 1, "E2E listing in English");
    await fillRichText(dialog, 2, "E2E объявление");
    await openTab(dialog, "სურათები");
    await dialog.locator('input[type="file"][multiple]').setInputFiles([
      testPng("l1.png", [200, 0, 0]),
      testPng("l2.png", [0, 200, 0]),
    ]);

    const created = waitForApi(page, "POST", /\/api\/vehicle-listings$/);
    const uploaded = waitForApi(page, "POST", /\/api\/vehicle-listings\/\d+\/images$/);
    await submitModal(page);
    ids.listing = entityOf(await (await created).json()).id;
    expect((await uploaded).status()).toBeLessThan(300);

    const listing = await getListing(ids.listing);
    expect(listing).toMatchObject({
      year: 2024,
      price: 8500,
      priceCurrency: "USD",
      stockQuantity: 3,
      mileageKm: 0,
      warrantyValue: 2,
      warrantyUnit: "YEAR",
      isActive: true,
      isFeaturedOnHomepage: true,
      isCustomsCleared: true,
    });
    expect(listing.vehicleCatalog.id).toBe(ids.catalogEntry);
    expect(String(listing.descriptionKa)).toContain("E2E განცხადება ქართულად");
    const images = await apiGet<{ images?: unknown[]; items?: unknown[] }>(page, `/vehicle-listings/${ids.listing}/images`);
    expect((images.images ?? images.items ?? []).length, "both images uploaded").toBe(2);
  });

  test("განცხადების რედაქტირება — ყველა ველი, GEL, მარაგი, ფასდაკლება, სურათი", async () => {
    await page.reload();
    await clickRowAction(page, names.model, "რედაქტირება");
    const dialog = modal(page);
    await expect(dialog.locator("#vl-price")).toHaveValue("8500");
    await pickSelect(page, "vl-condition", "მეორადი");
    await pickSelect(page, "vl-status", "დაჯავშნილია");
    await pickSelect(page, "vl-color", 1);
    await dialog.locator("#vl-year").fill("2023");
    await dialog.locator("#vl-price").fill("21000");
    await pickSelectByLabel(page, "ვალუტა", "₾");
    await dialog.locator("#vl-stock").fill("5");
    await dialog.locator("#vl-mileage").fill("1200");
    await dialog.locator("#vl-warranty-value").fill("6");
    await pickSelect(page, "vl-warranty-unit", "თვე");
    await setSwitch(dialog, "ახალი პროდუქცია სლაიდერში", false);
    await setSwitch(dialog, "განბაჟებულია", false);
    await openTab(dialog, "აღწერა");
    await fillRichText(dialog, 0, "E2E განცხადება შეცვლილი");
    await fillRichText(dialog, 1, "E2E listing edited");
    await fillRichText(dialog, 2, "E2E объявление изм");

    await openTab(dialog, "სურათები");
    const imageUpload = waitForApi(page, "POST", /\/api\/vehicle-listings\/\d+\/images$/);
    await dialog.locator('input[type="file"][multiple]').setInputFiles(testPng("l3.png", [0, 0, 200]));
    expect((await imageUpload).status()).toBeLessThan(300);

    // Discount tab right after changing the (still unsaved) price and
    // currency: the panel works from the STORED price (8500 USD) — what the
    // backend validates against — and tells the admin to save first, since a
    // currency change is refused while any discount exists.
    await openTab(dialog, "ფასდაკლებები");
    await expect(dialog.getByText(/ვალუტა შეცვლილია, მაგრამ ჯერ არ არის შენახული/)).toBeVisible();
    await dialog.getByPlaceholder("ფასდაკლება (%)").fill("10");
    await expect(dialog.getByPlaceholder(/ფასდაკლების ფასი \(\$\)/)).toHaveValue(/7650/);
    await dialog.getByPlaceholder("ფასდაკლება (%)").fill("");

    await openTab(dialog, "ძირითადი");
    await submitModal(page);

    // Reopened after saving: the panel now uses the new price (21000 GEL),
    // the warning is gone, and a second (later) discount is accepted.
    await clickRowAction(page, names.model, "რედაქტირება");
    const reopened = modal(page);
    await openTab(reopened, "ფასდაკლებები");
    await expect(reopened.getByText(/შეცვლილია, მაგრამ ჯერ არ არის შენახული/)).toHaveCount(0);
    await reopened.getByPlaceholder("ფასდაკლება (%)").fill("10");
    await expect(reopened.getByPlaceholder(/ფასდაკლების ფასი \(₾\)/)).toHaveValue(/18900/);
    await pickDate(page, reopened.getByRole("button", { name: "აირჩიეთ თარიღი" }).first(), "today");
    await pickDate(page, reopened.getByRole("button", { name: "აირჩიეთ თარიღი" }).first(), { monthsAhead: 1, day: 15 });
    const discountResponse = waitForApi(page, "POST", /\/api\/vehicle-listings\/\d+\/discounts$/);
    await reopened.getByRole("button", { name: "+ დამატება" }).click();
    const newPriceDiscount = await discountResponse;
    expect(newPriceDiscount.status(), await newPriceDiscount.text()).toBeLessThan(300);
    await reopened.getByRole("button", { name: "გაუქმება", exact: true }).last().click();

    const listing = await getListing(ids.listing);
    expect(listing).toMatchObject({
      year: 2023,
      price: 21000,
      priceCurrency: "GEL",
      stockQuantity: 5,
      mileageKm: 1200,
      warrantyValue: 6,
      warrantyUnit: "MONTH",
      isFeaturedOnHomepage: false,
      isCustomsCleared: false,
    });
    expect(listing.condition.key ?? listing.condition.id).toBeTruthy();
    expect(String(listing.descriptionKa)).toContain("E2E განცხადება შეცვლილი");
    const images = await apiGet<{ images?: unknown[]; items?: unknown[] }>(page, `/vehicle-listings/${ids.listing}/images`);
    expect((images.images ?? images.items ?? []).length, "third image added").toBe(3);
    const discounts = await apiGet<{ discounts?: unknown[]; items?: unknown[] }>(
      page,
      `/vehicle-listings/${ids.listing}/discounts`,
    );
    expect((discounts.discounts ?? discounts.items ?? []).length).toBe(1);
  });
});
