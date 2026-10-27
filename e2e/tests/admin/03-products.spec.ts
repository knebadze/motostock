import { test, expect, type Locator, type Page } from "@playwright/test";
import { loginAsAdmin } from "../helpers/auth";
import {
  apiGet,
  fillRichText,
  modal,
  openTab,
  pickDate,
  pickSelect,
  setSwitch,
  submitModal,
  tableRow,
  testPng,
  waitForApi,
} from "../helpers/admin";
import { checkFinding, e2eRun, entityOf, loadState, saveState } from "../helpers/admin-state";

// Product group, create + edit. Builds on the catalog group's E2E root
// category (products + attributes live there, and its fitment switch was
// turned on by that group's edit test) and vehicle catalog entry (fitment),
// and the classifier group's unit (attribute unit).
// Order: attributes → product brand → tag → product (+ variants, images,
// discounts, fitment, tags) → product edit (+ variant panel, fitment rules,
// buy-together).

test.describe.configure({ mode: "serial", timeout: 180_000 });

type CatalogState = { ids: Record<string, number>; names: Record<string, string> };
type ClassifierState = { run: string; ids: Record<string, number> };

const run = e2eRun();
let page: Page;
let catalog: CatalogState;
let classifiers: ClassifierState;
const ids: Record<string, number> = {};
const attributeIds: Record<"text" | "number" | "boolean" | "select", number> = {
  text: 0,
  number: 0,
  boolean: 0,
  select: 0,
};
const names = {
  brand: `E2E-TEST პროდ-ბრენდი ${run}`,
  tag: `E2E-TEST ტეგი ${run}`,
  productKa: `E2E-TEST პროდუქტი ${run}`,
};

test.beforeAll(async ({ browser }) => {
  catalog = loadState<CatalogState>("catalog");
  classifiers = loadState<ClassifierState>("classifiers");
  page = await browser.newPage();
  await loginAsAdmin(page);
});

test.afterAll(async () => {
  saveState("products", { run, ids, attributeIds, names });
  await page.close();
});

// Inputs in VariantCommonFields / the pricing tab have a <label> sibling but
// no id — addressed by that label's exact text.
function fieldByLabel(scope: Locator, label: string): Locator {
  return scope.locator(`div:has(> label:text-is("${label}")) > input`).first();
}

async function createAttribute(
  type: "TEXT" | "NUMBER" | "BOOLEAN" | "SELECT",
  typeLabel: string,
  extra?: (dialog: Locator) => Promise<void>,
): Promise<number> {
  await page.getByRole("button", { name: "+ მახასიათებლის დამატება" }).click();
  const dialog = modal(page);
  await pickSelect(page, "attribute-category", catalog.names.rootCategoryKa);
  await dialog.locator("#attribute-name-ka").fill(`E2E-TEST ${type} ${run}`);
  await dialog.locator("#attribute-name-en").fill(`E2E-TEST ${type} en ${run}`);
  await dialog.locator("#attribute-name-ru").fill(`E2E-TEST ${type} ru ${run}`);
  await pickSelect(page, "attribute-value-type", typeLabel);
  await extra?.(dialog);
  const created = waitForApi(page, "POST", /\/api\/attributes$/);
  await submitModal(page);
  return entityOf(await (await created).json()).id;
}

type Attribute = {
  id: number;
  name: Record<string, string>;
  valueType: string;
  required: boolean;
  unit: { id: number } | null;
};

async function getAttribute(id: number): Promise<Attribute> {
  const { items } = await apiGet<{ items: Attribute[] }>(page, `/attributes?categoryId=${catalog.ids.rootCategory}`);
  const attribute = items.find((item) => item.id === id);
  expect(attribute, `attribute ${id}`).toBeTruthy();
  return attribute!;
}

test.describe("მახასიათებლები", () => {
  test("4 ტიპის მახასიათებელი: TEXT (+ერთეული), NUMBER (სავალდ.), BOOLEAN, SELECT (+2 მნიშვნელობა)", async () => {
    await page.goto("/admin/attributes");
    const unitLabel = `E2E-TEST ერთეული შეცვლილი ${classifiers.run} (ე2ე2)`;
    attributeIds.text = await createAttribute("TEXT", "ტექსტი", async () => {
      await pickSelect(page, "attribute-unit", unitLabel);
    });
    attributeIds.number = await createAttribute("NUMBER", "რიცხვი", async (dialog) => {
      await dialog.getByLabel("სავალდებულო ველია").check();
    });
    attributeIds.boolean = await createAttribute("BOOLEAN", "დიახ/არა");
    attributeIds.select = await createAttribute("SELECT", "არჩევანი (სია)", async (dialog) => {
      await openTab(dialog, "მნიშვნელობები");
      for (const [key, label] of [
        ["e2e_one", "E2E ერთი"],
        ["e2e_two", "E2E ორი"],
      ]) {
        await dialog.getByPlaceholder("Key (მაგ. LEATHER)").fill(key);
        await dialog.getByPlaceholder("სახელი (ქართულად)").fill(label);
        await dialog.getByPlaceholder("სახელი (ინგლისურად)").fill(`${label} en`);
        await dialog.getByPlaceholder("სახელი (რუსულად)").fill(`${label} ru`);
        await dialog.getByRole("button", { name: "+ დამატება", exact: true }).click();
      }
      await expect(dialog.getByRole("cell", { name: "E2E ორი", exact: true })).toBeVisible();
    });

    const text = await getAttribute(attributeIds.text);
    expect(text).toMatchObject({ valueType: "TEXT", required: false, unit: { id: classifiers.ids.unit } });
    expect(text.name).toEqual({ ka: `E2E-TEST TEXT ${run}`, en: `E2E-TEST TEXT en ${run}`, ru: `E2E-TEST TEXT ru ${run}` });
    expect(await getAttribute(attributeIds.number)).toMatchObject({ valueType: "NUMBER", required: true });
    expect(await getAttribute(attributeIds.boolean)).toMatchObject({ valueType: "BOOLEAN" });
    expect(await getAttribute(attributeIds.select)).toMatchObject({ valueType: "SELECT" });
    const { items: options } = await apiGet<{ items: { key: string; label: Record<string, string> }[] }>(
      page,
      `/attributes/${attributeIds.select}/options`,
    );
    expect(options.map((option) => option.key).sort()).toEqual(["E2E_ONE", "E2E_TWO"]);
  });

  test("მახასიათებლების რედაქტირება — სახელი, სავალდებულო, ერთეული; SELECT მნიშვნელობების დამატება/რედაქტირება", async () => {
    await tableRow(page, `E2E-TEST TEXT ${run}`).getByRole("button", { name: "რედაქტირება" }).click();
    let dialog = modal(page);
    // Category and value type are locked once saved.
    await expect(dialog.locator("#attribute-category")).toBeDisabled();
    await expect(dialog.locator("#attribute-value-type")).toBeDisabled();
    await dialog.locator("#attribute-name-ka").fill(`E2E-TEST TEXT შეცვლილი ${run}`);
    await dialog.locator("#attribute-name-en").fill(`E2E-TEST TEXT edited ${run}`);
    await dialog.locator("#attribute-name-ru").fill(`E2E-TEST TEXT изм ${run}`);
    await dialog.getByLabel("სავალდებულო ველია").check();
    await pickSelect(page, "attribute-unit", "არცერთი");
    await submitModal(page);
    const text = await getAttribute(attributeIds.text);
    expect(text).toMatchObject({ required: true, unit: null });
    expect(text.name.ka).toBe(`E2E-TEST TEXT შეცვლილი ${run}`);

    await tableRow(page, `E2E-TEST NUMBER ${run}`).getByRole("button", { name: "რედაქტირება" }).click();
    dialog = modal(page);
    await dialog.getByLabel("სავალდებულო ველია").uncheck();
    await submitModal(page);
    expect((await getAttribute(attributeIds.number)).required).toBe(false);

    await tableRow(page, `E2E-TEST SELECT ${run}`).getByRole("button", { name: "რედაქტირება" }).click();
    dialog = modal(page);
    await openTab(dialog, "მნიშვნელობები");
    await expect(dialog.getByRole("cell", { name: "E2E ერთი", exact: true })).toBeVisible();
    // Add a third option (saved immediately in edit mode).
    await dialog.getByPlaceholder("Key (მაგ. LEATHER)").fill("e2e_three");
    await dialog.getByPlaceholder("სახელი (ქართულად)").fill("E2E სამი");
    await dialog.getByPlaceholder("სახელი (ინგლისურად)").fill("E2E three");
    await dialog.getByPlaceholder("სახელი (რუსულად)").fill("E2E три");
    const optionCreated = waitForApi(page, "POST", new RegExp(`/api/attributes/${attributeIds.select}/options$`));
    await dialog.getByRole("button", { name: "+ დამატება", exact: true }).click();
    expect((await optionCreated).status()).toBeLessThan(300);
    // Edit the first one.
    await dialog.locator("tr", { hasText: "E2E ერთი" }).getByRole("button", { name: "რედაქტირება" }).click();
    await dialog.getByPlaceholder("სახელი (ქართულად)").fill("E2E ერთი შეცვლილი");
    const optionUpdated = waitForApi(page, "PATCH", new RegExp(`/api/attributes/${attributeIds.select}/options/\\d+$`));
    await dialog.getByRole("button", { name: "შენახვა", exact: true }).first().click();
    expect((await optionUpdated).status()).toBe(200);
    await dialog.getByRole("button", { name: "გაუქმება", exact: true }).last().click();

    const { items: options } = await apiGet<{ items: { key: string; label: Record<string, string> }[] }>(
      page,
      `/attributes/${attributeIds.select}/options`,
    );
    expect(options.map((option) => option.key).sort()).toEqual(["E2E_ONE", "E2E_THREE", "E2E_TWO"]);
    expect(options.find((option) => option.key === "E2E_ONE")?.label.ka).toBe("E2E ერთი შეცვლილი");
  });
});

test.describe("პროდუქტის ბრენდი და ტეგი", () => {
  type ProductBrand = { id: number; name: string; slug: string; logoUrl: string | null; category?: { id: number } | null };

  async function getProductBrand(id: number): Promise<ProductBrand> {
    const { items } = await apiGet<{ items: ProductBrand[] }>(page, "/product-brands");
    const brand = items.find((item) => item.id === id);
    expect(brand, `product brand ${id}`).toBeTruthy();
    return brand!;
  }

  test("ბრენდის შექმნა (კატეგორია, სახელი, slug, ლოგო) და რედაქტირება", async () => {
    await page.goto("/admin/product-brands");
    await page.getByRole("button", { name: "+ ბრენდის დამატება" }).click();
    let dialog = modal(page);
    await pickSelect(page, "product-brand-category", catalog.names.rootCategoryKa);
    await dialog.locator("#product-brand-name").fill(names.brand);
    await expect(dialog.locator("#product-brand-slug")).not.toHaveValue("");
    await dialog.locator("#product-brand-slug").fill(`e2e-test-pbrand-${run}`);
    await dialog.locator("#product-brand-logo").setInputFiles(testPng("pbrand.png"));
    const created = waitForApi(page, "POST", /\/api\/product-brands$/);
    await submitModal(page);
    ids.productBrand = entityOf(await (await created).json()).id;
    let brand = await getProductBrand(ids.productBrand);
    expect(brand).toMatchObject({ name: names.brand, slug: `e2e-test-pbrand-${run}` });
    expect(brand.logoUrl).toBeTruthy();
    const firstLogo = brand.logoUrl;

    await tableRow(page, names.brand).getByRole("button", { name: "რედაქტირება" }).click();
    dialog = modal(page);
    names.brand = `E2E-TEST პროდ-ბრენდი შეცვლილი ${run}`;
    await dialog.locator("#product-brand-name").fill(names.brand);
    await dialog.locator("#product-brand-slug").fill(`e2e-test-pbrand-edited-${run}`);
    await dialog.locator("#product-brand-logo").setInputFiles(testPng("pbrand2.png", [0, 0, 0]));
    await submitModal(page);
    brand = await getProductBrand(ids.productBrand);
    expect(brand).toMatchObject({ name: names.brand, slug: `e2e-test-pbrand-edited-${run}` });
    expect(brand.logoUrl).not.toBe(firstLogo);
  });

  test("ტეგის შექმნა (სახელი, აღწერა, აქტიური) და რედაქტირება", async () => {
    type Tag = { id: number; name: string; description: string | null; isActive: boolean };
    await page.goto("/admin/tags");
    await page.getByRole("button", { name: "+ ტეგის დამატება" }).click();
    let dialog = modal(page);
    await dialog.locator("#tag-name").fill(names.tag);
    await dialog.locator("#tag-description").fill("E2E ტეგის აღწერა");
    await setSwitch(dialog, "აქტიური", true);
    const created = waitForApi(page, "POST", /\/api\/tags$/);
    await submitModal(page);
    ids.tag = entityOf(await (await created).json()).id;
    let { items } = await apiGet<{ items: Tag[] }>(page, "/tags");
    expect(items.find((tag) => tag.id === ids.tag)).toMatchObject({
      name: names.tag,
      description: "E2E ტეგის აღწერა",
      isActive: true,
    });

    await tableRow(page, names.tag).getByRole("button", { name: "რედაქტირება" }).click();
    dialog = modal(page);
    names.tag = `E2E-TEST ტეგი შეცვლილი ${run}`;
    await dialog.locator("#tag-name").fill(names.tag);
    await dialog.locator("#tag-description").fill("E2E ტეგის აღწერა შეცვლილი");
    await setSwitch(dialog, "აქტიური", false);
    await submitModal(page);
    ({ items } = await apiGet<{ items: Tag[] }>(page, "/tags"));
    expect(items.find((tag) => tag.id === ids.tag)).toMatchObject({
      name: names.tag,
      description: "E2E ტეგის აღწერა შეცვლილი",
      isActive: false,
    });
    // Leave it active for the product's buy-together tag below.
    await tableRow(page, names.tag).getByRole("button", { name: "რედაქტირება" }).click();
    await setSwitch(modal(page), "აქტიური", true);
    await submitModal(page);
  });
});

test.describe("პროდუქტი", () => {
  type Variant = {
    id: number;
    sku: string | null;
    finaId: number | null;
    price: number;
    stockQuantity: number;
    isActive: boolean;
    size: { id: number } | null;
    color: { id: number } | null;
    condition: { id: number } | null;
    status: { id: number } | null;
  };

  async function getProduct(): Promise<Record<string, unknown>> {
    return entityOf(await apiGet(page, `/products/${ids.product}/detail`));
  }

  async function getVariants(): Promise<Variant[]> {
    return (await apiGet<{ items: Variant[] }>(page, `/product-variants?productId=${ids.product}`)).items;
  }

  // Product form is a full page, not a modal: save → back to the list.
  async function submitProductForm() {
    const errorToast = page.locator("[data-sonner-toast][data-type='error']");
    await page.locator("form").getByRole("button", { name: "შენახვა", exact: true }).last().click();
    const outcome = await Promise.race([
      page.waitForURL(/\/admin\/products$/, { timeout: 30_000 }).then(() => "saved" as const),
      errorToast.first().waitFor({ timeout: 30_000 }).then(() => "error" as const),
    ]);
    if (outcome === "saved") await page.waitForTimeout(400);
    if ((await errorToast.count()) > 0) {
      const fieldErrors = await page.locator("form [role='alert']").allInnerTexts();
      throw new Error(`product save toast: ${await errorToast.first().innerText()} | field errors: ${fieldErrors.join("; ")}`);
    }
  }

  test("ახალი პროდუქტი — ყველა ჩანართი: ძირითადი, მახასიათებლები, აღწერა, სურათი, SEO, ფასი/ვარიანტები, თავსებადობა, ტეგი", async () => {
    await page.goto("/admin/products/new");
    const form = page.locator("form");

    // ძირითადი
    await pickSelect(page, "product-category", catalog.names.rootCategoryKa);
    await pickSelect(page, "product-brand", names.brand);
    await form.locator("#product-name-ka").fill(names.productKa);
    await form.locator("#product-name-en").fill(`E2E-TEST Product ${run}`);
    await form.locator("#product-name-ru").fill(`E2E-TEST Продукт ${run}`);
    await setSwitch(form, "ახალი პროდუქცია სლაიდერში", true);

    // მახასიათებლები
    await openTab(form, "მახასიათებლები");
    await form.locator(`#product-attribute-${attributeIds.text}`).fill("E2E ტექსტი");
    await form.locator(`#product-attribute-${attributeIds.number}`).fill("42");
    await form
      .locator(`div:has(> label:text-is("E2E-TEST BOOLEAN ${run}"))`)
      .getByRole("checkbox")
      .check();
    await pickSelect(page, `product-attribute-${attributeIds.select}`, "E2E ერთი შეცვლილი");

    // აღწერა
    await openTab(form, "აღწერა");
    await fillRichText(form, 0, "E2E პროდუქტის აღწერა");
    await fillRichText(form, 1, "E2E product description");
    await fillRichText(form, 2, "E2E описание продукта");

    // სურათი
    await openTab(form, "სურათი");
    await form.locator("#product-image").setInputFiles(testPng("product.png"));

    // SEO
    await openTab(form, "SEO");
    await expect(form.locator("#product-slug")).toHaveValue(`e2e-test-product-${run}`);
    for (const locale of ["ka", "en", "ru"]) {
      await form.locator(`#product-meta-title-${locale}`).fill(`E2E meta title ${locale}`);
      await form.locator(`#product-meta-description-${locale}`).fill(`E2E meta description ${locale}`);
    }

    // ფასი: 2 sizes × 1 color → 2 draft variants
    await openTab(form, "ფასი");
    await pickSelect(page, "product-pricing-sizes", 0);
    await pickSelect(page, "product-pricing-sizes", 1);
    await pickSelect(page, "product-pricing-colors", 0);
    await pickSelect(page, "product-pricing-condition", 0);
    await pickSelect(page, "product-pricing-status", 0);
    await fieldByLabel(form, "SKU").fill(`E2E-SKU-${run}`);
    await fieldByLabel(form, "ფასი").fill("150");
    await fieldByLabel(form, "მარაგში (ცალი)").fill("7");
    await form.getByRole("button", { name: "+ ვარიანტების გენერაცია" }).click();
    const draftRows = form.locator("table tbody tr:visible");
    await expect(draftRows).toHaveCount(2);
    // The base SKU ("საერთო ყველასთვის") is copied verbatim into every draft
    // row, but SKUs are unique — saving as-is drops the second variant.
    const draftSkus = await draftRows.locator('input[type="text"]').evaluateAll((inputs) =>
      inputs.map((input) => (input as HTMLInputElement).value),
    );
    checkFinding(
      new Set(draftSkus).size === draftSkus.length,
      "პროდუქტი: „საერთო“ SKU ყველა ვარიანტზე კოპირდება, უნიკალურობა კი მეორეს უარყოფს",
      `draft SKUs: ${draftSkus.join(", ")} → saving shows "ეს ვარიანტ(ებ)ი ვერ დაემატა"`,
    );
    await draftRows.nth(1).locator('input[type="text"]').fill(`E2E-SKU-${run}-2`);
    // First draft variant: own price, image + discount.
    await draftRows.nth(0).locator('input[type="number"][step="0.01"]').fill("160");
    await draftRows.nth(0).getByRole("button", { name: /სურათები\/ფასდაკლება/ }).click();
    const extras = form.locator("table tbody tr:visible").nth(1);
    await extras.locator('input[type="file"][multiple]').setInputFiles(testPng("variant.png", [90, 90, 0]));
    await extras.getByPlaceholder("ფასდაკლება (%)").fill("10");
    await expect(extras.getByPlaceholder("ფასდაკლების ფასი")).toHaveValue("144.00");
    await pickDate(page, extras.getByRole("button", { name: "აირჩიეთ თარიღი" }).first(), "today");
    await pickDate(page, extras.getByRole("button", { name: "აირჩიეთ თარიღი" }).first(), { monthsAhead: 1, day: 15 });

    // თავსებადობა (root category has fitment on after the catalog group's edit)
    await openTab(form, "თავსებადობა");
    await page.getByRole("button", { name: "ტექნიკა კატალოგიდან" }).click();
    await page.locator('[role="combobox"]:visible').last().fill(catalog.names.model);
    await page.locator('[role="listbox"]:visible').last().getByRole("option").first().click();
    await form.getByRole("button", { name: "+ დამატება", exact: true }).click();
    await expect(form.getByText("თავსებადობა ჯერ არ დამატებულა")).toHaveCount(0);

    // ერთად შეძენა: tag
    await openTab(form, "ერთად შეძენა");
    await pickSelect(page, "product-tags", names.tag);

    const created = waitForApi(page, "POST", /\/api\/products$/);
    await submitProductForm();
    ids.product = entityOf(await (await created).json()).id;

    const product = await getProduct();
    expect(product).toMatchObject({
      slug: `e2e-test-product-${run}`,
      isFeaturedOnHomepage: true,
      metaTitleKa: "E2E meta title ka",
      metaTitleEn: "E2E meta title en",
      metaDescriptionRu: "E2E meta description ru",
    });
    expect(JSON.stringify(product)).toContain(names.productKa);
    expect(String(product.descriptionKa)).toContain("E2E პროდუქტის აღწერა");
    expect(product.imageUrl, "product image").toBeTruthy();
    const productJson = JSON.stringify(product);
    expect(productJson, "attribute TEXT value").toContain("E2E ტექსტი");
    expect(productJson, "product brand").toContain(names.brand);

    const variants = await getVariants();
    expect(variants).toHaveLength(2);
    const prices = variants.map((variant) => variant.price).sort();
    expect(prices).toEqual([150, 160]);
    for (const variant of variants) {
      expect(variant.stockQuantity).toBe(7);
      expect(variant.color, "color").not.toBeNull();
      expect(variant.condition, "condition").not.toBeNull();
      expect(variant.status, "status").not.toBeNull();
    }
    const pricey = variants.find((variant) => variant.price === 160)!;
    ids.variant = pricey.id;
    const images = await apiGet<{ items: unknown[] }>(page, `/product-variants/${pricey.id}/images`);
    expect(images.items.length, "draft variant image uploaded").toBe(1);
    const discounts = await apiGet<{ items: { discountPrice: number }[] }>(page, `/product-variants/${pricey.id}/discounts`);
    expect(discounts.items.map((item) => item.discountPrice)).toEqual([144]);
    const fitments = await apiGet<{ items: { vehicleCatalog?: { id: number }; vehicleCatalogId?: number }[] }>(
      page,
      `/products/${ids.product}/fitments`,
    );
    expect(fitments.items.length, "draft fitment saved").toBe(1);
    const tagProducts = await apiGet<{ items: { id: number }[] }>(page, `/tags/${ids.tag}/products`);
    expect(tagProducts.items.map((item) => item.id)).toContain(ids.product);
  });

  test("პროდუქტის რედაქტირება — სახელები, მახასიათებლები, აღწერა, სურათი, SEO, ვარიანტი (რედაქტ./დამატება/სურათი/ფასდაკლება), თავსებადობის წესი, ერთად შეძენა", async () => {
    await page.goto(`/admin/products/${ids.product}`);
    const form = page.locator("form");
    await expect(form.locator("#product-name-ka")).toHaveValue(names.productKa);
    // Category is locked on edit.
    await expect(page.locator("#product-category")).toBeDisabled();
    names.productKa = `E2E-TEST პროდუქტი შეცვლილი ${run}`;
    await form.locator("#product-name-ka").fill(names.productKa);
    await form.locator("#product-name-en").fill(`E2E-TEST Product Edited ${run}`);
    await form.locator("#product-name-ru").fill(`E2E-TEST Продукт изм ${run}`);
    await setSwitch(form, "ახალი პროდუქცია სლაიდერში", false);

    await openTab(form, "მახასიათებლები");
    await form.locator(`#product-attribute-${attributeIds.text}`).fill("E2E ტექსტი შეცვლილი");
    await form.locator(`#product-attribute-${attributeIds.number}`).fill("43");
    await form
      .locator(`div:has(> label:text-is("E2E-TEST BOOLEAN ${run}"))`)
      .getByRole("checkbox")
      .uncheck();
    await pickSelect(page, `product-attribute-${attributeIds.select}`, "E2E სამი");

    await openTab(form, "აღწერა");
    await fillRichText(form, 0, "E2E პროდუქტის აღწერა შეცვლილი");
    await fillRichText(form, 1, "E2E product description edited");
    await fillRichText(form, 2, "E2E описание изм");
    await openTab(form, "სურათი");
    const before = await getProduct();
    await form.locator("#product-image").setInputFiles(testPng("product2.png", [0, 100, 100]));
    await openTab(form, "SEO");
    const slugAfterRename = await form.locator("#product-slug").inputValue();
    checkFinding(
      slugAfterRename === `e2e-test-product-${run}`,
      "პროდუქტის რედაქტირება: EN სახელის შეცვლა slug-ს ცვლის",
      `slug became "${slugAfterRename}"`,
    );
    await form.locator("#product-slug").fill(`e2e-test-product-edited-${run}`);
    for (const locale of ["ka", "en", "ru"]) {
      await form.locator(`#product-meta-title-${locale}`).fill(`E2E meta title edited ${locale}`);
      await form.locator(`#product-meta-description-${locale}`).fill(`E2E meta description edited ${locale}`);
    }

    // ვარიანტები — saved immediately, independent of the product form.
    await openTab(form, "ვარიანტები");
    const variantRow = form.locator("table tbody tr:visible", { hasText: "160" }).first();
    await variantRow.getByRole("button", { name: "რედაქტირება" }).click();
    const editBox = form.locator("div:has(> h3:text-is('ვარიანტის რედაქტირება'))");
    await fieldByLabel(editBox, "SKU").fill(`E2E-SKU-ED-${run}`);
    await fieldByLabel(editBox, "ფასი *").fill("170");
    await fieldByLabel(editBox, "მარაგში (ცალი)").fill("9");
    await pickSelect(page, "variant-status", 1);
    const variantSaved = waitForApi(page, "PATCH", /\/api\/product-variants\/\d+$/);
    await editBox.getByRole("button", { name: "შენახვა", exact: true }).click();
    expect((await variantSaved).status()).toBe(200);

    // Add one more variant (3rd size).
    const addBox = form.locator("div:has(> h3:text-is('ვარიანტების დამატება'))");
    await pickSelect(page, "variant-add-sizes", 2);
    await fieldByLabel(addBox, "ფასი *").fill("155");
    await fieldByLabel(addBox, "მარაგში (ცალი)").fill("2");
    const variantAdded = waitForApi(page, "POST", /\/api\/product-variants$/);
    await addBox.getByRole("button", { name: "+ ვარიანტების გენერაცია" }).click();
    expect((await variantAdded).status()).toBeLessThan(300);

    // Images + discount for the edited variant.
    await form.locator("table tbody tr:visible", { hasText: "170" }).first()
      .getByRole("button", { name: "სურათები/ფასდაკლება" }).click();
    const imageUploaded = waitForApi(page, "POST", /\/api\/product-variants\/\d+\/images$/);
    await form.locator('input[type="file"][multiple]:not([disabled])').last().setInputFiles(testPng("variant2.png", [10, 200, 10]));
    expect((await imageUploaded).status()).toBeLessThan(300);
    const discountPanel = form.locator("div:has(> h3:text-is('ფასდაკლებები'))").last();
    await discountPanel.getByPlaceholder("ფასდაკლება (%)").fill("20");
    await pickDate(page, discountPanel.getByRole("button", { name: "აირჩიეთ თარიღი" }).first(), { monthsAhead: 2, day: 1 });
    await pickDate(page, discountPanel.getByRole("button", { name: "აირჩიეთ თარიღი" }).first(), { monthsAhead: 2, day: 20 });
    const discountAdded = waitForApi(page, "POST", /\/api\/product-variants\/\d+\/discounts$/);
    await discountPanel.getByRole("button", { name: "+ დამატება", exact: true }).click();
    const discountResponse = await discountAdded;
    expect(discountResponse.status(), await discountResponse.text()).toBeLessThan(300);
    await page.locator("[data-sonner-toast]").first().waitFor({ state: "detached", timeout: 10_000 }).catch(() => {});

    // FIXED type: a percent typed first, then a price typed by hand — the
    // percent is dropped and the row is stored as a fixed price.
    await discountPanel.getByPlaceholder("ფასდაკლება (%)").fill("30");
    await discountPanel.getByPlaceholder("ფასდაკლების ფასი *").fill("149");
    await expect(discountPanel.getByPlaceholder("ფასდაკლება (%)")).toHaveValue("");
    await pickDate(page, discountPanel.getByRole("button", { name: "აირჩიეთ თარიღი" }).first(), { monthsAhead: 3, day: 1 });
    await pickDate(page, discountPanel.getByRole("button", { name: "აირჩიეთ თარიღი" }).first(), { monthsAhead: 3, day: 10 });
    const fixedAdded = waitForApi(page, "POST", /\/api\/product-variants\/\d+\/discounts$/);
    await discountPanel.getByRole("button", { name: "+ დამატება", exact: true }).click();
    const fixedResponse = await fixedAdded;
    expect(fixedResponse.status(), await fixedResponse.text()).toBeLessThan(300);
    await expect(discountPanel.getByRole("cell", { name: "ფიქსირებული ფასი" }).first()).toBeVisible();
    await expect(discountPanel.getByRole("cell", { name: "პროცენტული (−20%)" }).first()).toBeVisible();

    // თავსებადობა: rule "all vehicles of the E2E type category".
    await openTab(form, "თავსებადობა");
    const ruleTypeTrigger = form.locator("div:has(> label:text-is('ტიპი')) button[aria-haspopup='listbox']").last();
    await ruleTypeTrigger.click();
    const ruleTypes = page.locator('[role="listbox"]:visible').last().getByRole("option");
    const ruleTypeLabels = await ruleTypes.allTextContents();
    const categoryRuleIndex = ruleTypeLabels.findIndex((label) => /კატეგორი/.test(label));
    await ruleTypes.nth(categoryRuleIndex).click();
    const categoryTrigger = form.locator("div:has(> label:text-is('კატეგორია')) button[aria-haspopup='listbox']").last();
    await categoryTrigger.click();
    await page.locator('[role="combobox"]:visible').last().fill(catalog.names.vehicleCategoryKa);
    await page.locator('[role="listbox"]:visible').last().getByRole("option").first().click();
    const ruleAdded = waitForApi(page, "POST", /\/api\/products\/\d+\/fitment-rules$/);
    await form.getByRole("button", { name: "+ წესის დამატება" }).click();
    const ruleResponse = await ruleAdded;
    expect(ruleResponse.status(), await ruleResponse.text()).toBeLessThan(300);

    // ერთად შეძენა: link another product. The backend only accepts a
    // companion that shares a compatible vehicle (or has no fitment), so try
    // the options in turn until one is accepted.
    await openTab(form, "ერთად შეძენა");
    const companionAdd = form
      .locator("div")
      .filter({ has: page.getByRole("button", { name: "ერთად შესაძენი პროდუქტი" }) })
      .getByRole("button", { name: "+ დამატება", exact: true })
      .last();
    let companionLinked = false;
    for (let optionIndex = 0; optionIndex < 15 && !companionLinked; optionIndex++) {
      await page.getByRole("button", { name: "ერთად შესაძენი პროდუქტი" }).click();
      const options = page.locator('[role="listbox"]:visible').last().getByRole("option");
      if (optionIndex >= (await options.count())) break;
      await options.nth(optionIndex).click();
      const buyTogetherAdded = waitForApi(page, "POST", new RegExp(`/api/products/${ids.product}/buy-together$`));
      await companionAdd.click();
      const response = await buyTogetherAdded;
      if (response.ok()) {
        companionLinked = true;
      } else {
        const body = await response.text();
        test.info().annotations.push({ type: "note", description: `buy-together option #${optionIndex} rejected: ${body}` });
        await page.locator("[data-sonner-toast][data-type='error']").first().waitFor({ state: "detached", timeout: 10_000 }).catch(() => {});
      }
    }
    expect(companionLinked, "a compatible buy-together companion was accepted").toBe(true);

    const updated = waitForApi(page, "PATCH", new RegExp(`/api/products/${ids.product}$`));
    await submitProductForm();
    expect((await updated).status()).toBe(200);

    const product = await getProduct();
    expect(product).toMatchObject({
      slug: `e2e-test-product-edited-${run}`,
      isFeaturedOnHomepage: false,
      metaTitleKa: "E2E meta title edited ka",
      metaDescriptionEn: "E2E meta description edited en",
    });
    const productJson = JSON.stringify(product);
    expect(productJson).toContain(names.productKa);
    expect(productJson, "attribute TEXT value edited").toContain("E2E ტექსტი შეცვლილი");
    expect(String(product.descriptionKa)).toContain("E2E პროდუქტის აღწერა შეცვლილი");
    expect(product.imageUrl).not.toBe(before.imageUrl);

    const variants = await getVariants();
    expect(variants).toHaveLength(3);
    const edited = variants.find((variant) => variant.id === ids.variant)!;
    expect(edited).toMatchObject({ price: 170, stockQuantity: 9, sku: `E2E-SKU-ED-${run}` });
    expect(variants.some((variant) => variant.price === 155 && variant.stockQuantity === 2)).toBe(true);
    const images = await apiGet<{ items: unknown[] }>(page, `/product-variants/${ids.variant}/images`);
    expect(images.items.length).toBe(2);
    const discounts = await apiGet<{ items: { discountPrice: number; discountPercent: number | null }[] }>(
      page,
      `/product-variants/${ids.variant}/discounts`,
    );
    expect(discounts.items.length).toBe(3);
    // PERCENT discounts follow the price: the 10% one made against 160 is now
    // 10% of 170, and the new 20% one is computed from 170 too.
    const byPercent = (percent: number | null) => discounts.items.find((item) => item.discountPercent === percent);
    expect(byPercent(10)?.discountPrice, "10% re-derived after 160 → 170").toBe(153);
    expect(byPercent(20)?.discountPrice).toBe(136);
    // FIXED discount keeps exactly the typed price.
    expect(byPercent(null)?.discountPrice).toBe(149);
    const rules = await apiGet<{ items: unknown[] }>(page, `/products/${ids.product}/fitment-rules`);
    expect(rules.items.length).toBe(1);
    const buyTogether = await apiGet<{ items: unknown[] }>(page, `/products/${ids.product}/buy-together`);
    expect(buyTogether.items.length).toBe(1);
  });
});
