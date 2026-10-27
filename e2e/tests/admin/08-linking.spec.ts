import { test, expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { loginAsAdmin } from "../helpers/auth";
import { apiGet, modal, openTab, pickDate, pickSelect, pickSelectByLabel, submitModal, tableRow, testPng, waitForApi } from "../helpers/admin";
import { BACKEND_URL } from "../../env.js";
import { checkFinding, e2eRun, entityOf, loadState, saveState } from "../helpers/admin-state";

// Linking group — every save/link variant of:
//  A. bulk tag assignment from the product list (assign / already-had /
//     unassign / didn't-have / selection across filters / select-page /
//     inactive tag), checked end-to-end in the storefront's buy-together;
//  B. hero slide created from a promo code and from a bulk-discount event
//     (validation, create without subtitle/image, edit + image, clear
//     subtitle, edit from the general slides page, visibility vs the
//     campaign's state);
//  C. linking a walk-in customer to a real account (manual link, the
//     phone-claim flow after registration, rejected targets, re-registering
//     a merged walk-in's phone).
// Depends on the earlier groups' state; run the whole chain.

test.describe.configure({ mode: "serial", timeout: 240_000 });

type CatalogState = { ids: Record<string, number>; names: Record<string, string> };
type ProductsState = { run: string; ids: Record<string, number>; names: Record<string, string> };
type MarketingState = { run: string; ids: Record<string, number> };

const run = e2eRun();
let page: Page;
let customer: APIRequestContext;
let catalog: CatalogState;
let products: ProductsState;
let marketing: MarketingState;
const ids: Record<string, number> = {};
const names: Record<string, string> = {};

test.beforeAll(async ({ browser, playwright }) => {
  catalog = loadState<CatalogState>("catalog");
  products = loadState<ProductsState>("products");
  marketing = loadState<MarketingState>("marketing");
  page = await browser.newPage();
  await loginAsAdmin(page);
  customer = await playwright.request.newContext();
});

test.afterAll(async () => {
  saveState("linking", { run, ids, names });
  await customer.dispose();
  await page.close();
});

function toastWith(text: string | RegExp): Locator {
  return page.locator("[data-sonner-toast]").filter({ hasText: text }).first();
}

async function waitToastsGone() {
  await page.locator("[data-sonner-toast]").first().waitFor({ state: "detached", timeout: 10_000 }).catch(() => {});
}

// ============================ A. Bulk tags ============================

test.describe("ტეგების მასობრივი მინიჭება", () => {
  type TagProduct = { id: number };
  const productSlug = () => `e2e-test-product-edited-${products.run}`;

  async function tagProductIds(): Promise<number[]> {
    const { items } = await apiGet<{ items: TagProduct[] }>(page, `/tags/${products.ids.tag}/products`);
    return items.map((item) => item.id);
  }

  async function publicBundleIds(): Promise<number[]> {
    const response = await page.request.get(`${BACKEND_URL}/api/products/by-slug/${productSlug()}`);
    expect(response.ok(), "public product detail").toBe(true);
    const { item } = (await response.json()) as { item: { buyTogether?: { id: number }[] } };
    return (item.buyTogether ?? []).map((companion) => companion.id);
  }

  async function filterBySearch(text: string) {
    const panel = page.locator("main details");
    if (!(await panel.getAttribute("open"))) await panel.locator("summary").click();
    await panel.locator('div:has(> label:text-is("ძებნა (სახელი)")) > input').fill(text);
    await panel.getByRole("button", { name: "გაფილტვრა" }).click();
    await expect(tableRow(page, text)).toBeVisible();
  }

  async function selectProductRow(name: string) {
    await page.getByRole("checkbox", { name: `მონიშვნა: ${name}` }).first().check();
  }

  async function runBulk(action: "ტეგის მინიჭება" | "ტეგის მოხსნა", tagLabel: string) {
    const bar = page.locator("div.sticky", { hasText: "მონიშნულია:" });
    await pickSelectByLabel(page, "ტეგი მასობრივი ქმედებისთვის", tagLabel, bar);
    const path = action === "ტეგის მინიჭება" ? "assign" : "unassign";
    const done = waitForApi(page, "POST", new RegExp(`/api/tags/${products.ids.tag}/products/${path}$`));
    await bar.getByRole("button", { name: action }).click();
    const response = await done;
    expect(response.status(), await response.text()).toBe(200);
    return (await response.json()) as { changed: number };
  }

  test("კომპანიონის არჩევა: სხვა კატეგორიის, მარაგში არსებული პროდუქტი", async () => {
    const response = await page.request.get(`${BACKEND_URL}/api/products?pageSize=100`);
    const { items } = (await response.json()) as {
      items: { id: number; slug: string; name: { ka: string }; category: { id: number }; totalStock: number }[];
    };
    const companion = items.find(
      (item) => item.category.id !== catalog.ids.rootCategory && item.totalStock > 0 && !item.name.ka.startsWith("E2E"),
    );
    expect(companion, "a seeded in-stock product in another category").toBeTruthy();
    ids.companion = companion!.id;
    names.companion = companion!.name.ka;
    // The E2E product already carries the tag (set in its product form).
    expect(await tagProductIds()).toContain(products.ids.product);
    expect(await tagProductIds()).not.toContain(ids.companion);
  });

  test("მონიშვნა ფილტრებს შორის ინახება; მინიჭება 2 პროდუქტზე, საიდანაც 1-ს უკვე ჰქონდა", async () => {
    await page.goto("/admin/products");
    await filterBySearch(products.names.productKa);
    await selectProductRow(products.names.productKa);
    const bar = page.locator("div.sticky", { hasText: "მონიშნულია:" });
    await expect(bar).toContainText("მონიშნულია: 1");
    // Buttons stay disabled until a tag is picked.
    await expect(bar.getByRole("button", { name: "ტეგის მინიჭება" })).toBeDisabled();
    await expect(bar.getByRole("button", { name: "ტეგის მოხსნა" })).toBeDisabled();

    await filterBySearch(names.companion);
    await selectProductRow(names.companion);
    await expect(bar).toContainText("მონიშნულია: 2");

    const result = await runBulk("ტეგის მინიჭება", products.names.tag);
    expect(result.changed).toBe(1);
    await expect(toastWith(`მიენიჭა 1 პროდუქტს (1-ს უკვე ჰქონდა)`)).toBeVisible();
    // Selection clears after a successful run.
    await expect(bar).toHaveCount(0);
    const tagged = await tagProductIds();
    expect(tagged).toEqual(expect.arrayContaining([products.ids.product, ids.companion]));
  });

  test("საიტზე: საერთო აქტიური ტეგის მქონე კომპანიონი ჩანს პროდუქტის „ერთად შეძენაში“", async () => {
    const bundle = await publicBundleIds();
    checkFinding(
      bundle.includes(ids.companion),
      "ტეგები: საერთო აქტიური ტეგის მქონე პროდუქტი „ერთად შეძენაში“ არ ჩანს",
      `bundle=${JSON.stringify(bundle)}, companion=${ids.companion}`,
    );
  });

  test("ფილტრი „ტეგი“ აჩვენებს ორივე მონიშნულ პროდუქტს; „გვერდის ყველა“ + „მონიშვნის გაუქმება“", async () => {
    await page.goto("/admin/products");
    const panel = page.locator("main details");
    await panel.locator("summary").click();
    await pickSelect(page, (await panel.locator('div:has(> label:text-is("ტეგი")) button[aria-haspopup="listbox"]').getAttribute("id"))!, products.names.tag);
    await panel.getByRole("button", { name: "გაფილტვრა" }).click();
    await expect(tableRow(page, products.names.productKa)).toBeVisible();
    await expect(tableRow(page, names.companion)).toBeVisible();
    const rowCount = await page.locator("table tbody tr").count();

    await page.getByLabel(/გვერდის ყველა პროდუქტის მონიშვნა/).check();
    const bar = page.locator("div.sticky", { hasText: "მონიშნულია:" });
    await expect(bar).toContainText(`მონიშნულია: ${rowCount}`);
    await page.getByLabel(/გვერდის ყველა პროდუქტის მონიშვნა/).uncheck();
    await expect(bar).toHaveCount(0);
    await page.getByLabel(/გვერდის ყველა პროდუქტის მონიშვნა/).check();
    await bar.getByRole("button", { name: "მონიშვნის გაუქმება" }).click();
    await expect(bar).toHaveCount(0);
  });

  test("მოხსნა კომპანიონიდან; განმეორებითი მოხსნა — „1-ს არ ჰქონდა“; კომპანიონი ქრება საიტიდან", async () => {
    await page.goto("/admin/products");
    await filterBySearch(names.companion);
    await selectProductRow(names.companion);
    let result = await runBulk("ტეგის მოხსნა", products.names.tag);
    expect(result.changed).toBe(1);
    await expect(toastWith("მოეხსნა 1 პროდუქტს")).toBeVisible();
    await waitToastsGone();
    expect(await tagProductIds()).not.toContain(ids.companion);
    expect(await tagProductIds()).toContain(products.ids.product);

    await selectProductRow(names.companion);
    result = await runBulk("ტეგის მოხსნა", products.names.tag);
    expect(result.changed).toBe(0);
    await expect(toastWith("მოეხსნა 0 პროდუქტს (1-ს არ ჰქონდა)")).toBeVisible();
    expect(await publicBundleIds()).not.toContain(ids.companion);
  });

  test("გამორთული ტეგი: სიაში „(გამორთული)“, მინიჭება შესაძლებელია, მაგრამ საიტზე კომპანიონს არ აჩვენებს", async () => {
    // Deactivate the tag in the tags page.
    await page.goto("/admin/tags");
    await tableRow(page, products.names.tag).getByRole("button", { name: "რედაქტირება" }).click();
    let dialog = modal(page);
    await dialog.getByRole("switch", { name: "აქტიური" }).click();
    await submitModal(page);

    await page.goto("/admin/products");
    await filterBySearch(names.companion);
    await selectProductRow(names.companion);
    const result = await runBulk("ტეგის მინიჭება", `${products.names.tag} (გამორთული)`);
    expect(result.changed).toBe(1);
    expect(await tagProductIds()).toContain(ids.companion);
    checkFinding(
      !(await publicBundleIds()).includes(ids.companion),
      "ტეგები: გამორთული ტეგი მაინც აკავშირებს პროდუქტებს „ერთად შეძენაში“",
      `companion ${ids.companion} shown via inactive tag`,
    );

    // Back to the starting state: tag active, companion untagged.
    await waitToastsGone();
    await selectProductRow(names.companion);
    await runBulk("ტეგის მოხსნა", `${products.names.tag} (გამორთული)`);
    await page.goto("/admin/tags");
    await tableRow(page, products.names.tag).getByRole("button", { name: "რედაქტირება" }).click();
    dialog = modal(page);
    await dialog.getByRole("switch", { name: "აქტიური" }).click();
    await submitModal(page);
  });
});

// ======================= B. Campaign hero slides =======================

test.describe("სლაიდი პრომოკოდიდან და ივენთიდან", () => {
  type Slide = {
    id: number;
    isActive: boolean;
    imageUrl: string | null;
    title: Record<string, string>;
    subtitle: Record<string, string> | null;
    buttonLabel: Record<string, string> | null;
    type: string;
  };
  type PromoCode = { id: number; code: string; heroSlideId: number | null };

  async function publicSlideIds(): Promise<number[]> {
    const response = await page.request.get(`${BACKEND_URL}/api/hero-slides/public`);
    const { items } = (await response.json()) as { items: { id: number }[] };
    return items.map((item) => item.id);
  }

  function field(dialog: Locator, label: string): Locator {
    return dialog.locator(`div:has(> label:text-is("${label}")) > :is(input, textarea)`);
  }

  // Save + image upload. A failed upload shows an error toast but still
  // closes the modal; record it as a finding instead of stopping the chain.
  async function saveSlideWithImage(dialog: Locator, owner: string, ownerId: number, label: string) {
    const saved = waitForApi(page, "PUT", new RegExp(`/api/${owner}/${ownerId}/hero-slide$`));
    const imaged = waitForApi(page, "POST", /\/hero-slide\/image$/);
    await dialog.getByRole("button", { name: "შენახვა", exact: true }).click();
    const slideResponse = await saved;
    expect(slideResponse.status(), await slideResponse.text()).toBe(200);
    const slide = entityOf(await slideResponse.json());
    const imageResponse = await imaged;
    const imagePath = new URL(imageResponse.url()).pathname;
    checkFinding(
      imageResponse.ok(),
      `${label}: სურათი ვერ იტვირთება — ატვირთვას სლაიდის ID გადაეცემა ${owner === "promo-codes" ? "პრომოკოდის" : "ივენთის"} ID-ის ნაცვლად`,
      `slide id ${slide.id}, owner id ${ownerId} → POST ${imagePath} → ${imageResponse.status()}`,
    );
    await dialog.waitFor({ state: "detached", timeout: 20_000 });
    await waitToastsGone();
    return { slideId: slide.id, imageOk: imageResponse.ok() };
  }

  async function fillSlideForm(
    dialog: Locator,
    values: { title?: string[]; subtitle?: string[]; button?: string[] },
  ) {
    const locales = ["ქართულად", "ინგლისურად", "რუსულად"];
    for (const [index, locale] of locales.entries()) {
      if (values.title) await field(dialog, `სათაური (${locale}) *`).fill(values.title[index]);
      if (values.subtitle) await field(dialog, `ქვესათაური (${locale})`).fill(values.subtitle[index]);
      if (values.button) await field(dialog, `ღილაკის ტექსტი (${locale}) *`).fill(values.button[index]);
    }
  }

  async function getPromo(domain: "PRODUCT" | "VEHICLE", id: number): Promise<PromoCode> {
    const { items } = await apiGet<{ items: PromoCode[] }>(page, `/promo-codes?domain=${domain}`);
    return items.find((item) => item.id === id)!;
  }

  async function openPromoSlideModal(code: string, tab: "პროდუქტები" | "ტრანსპორტი", ariaLabel: string) {
    await page.goto("/admin/promo-codes");
    if (tab === "ტრანსპორტი") await openTab(page.locator("main"), "ტრანსპორტი");
    await tableRow(page, code).getByRole("button", { name: ariaLabel }).click();
    return modal(page);
  }

  test("ვალიდაცია: ცარიელი სათაური ან ღილაკის ტექსტი არ ინახება (მოთხოვნა არ იგზავნება)", async () => {
    const promo = await getPromo("VEHICLE", marketing.ids.vehiclePromo);
    names.vehiclePromoCode = promo.code;
    const dialog = await openPromoSlideModal(
      promo.code,
      "ტრანსპორტი",
      promo.heroSlideId == null ? "სლაიდის შექმნა" : "სლაიდის რედაქტირება",
    );
    // Title is prefilled from the code ("-7.5% ... E2EV...").
    if (promo.heroSlideId == null) await expect(field(dialog, "სათაური (ქართულად) *")).toHaveValue(new RegExp(promo.code));
    let requests = 0;
    page.on("request", (request) => {
      if (request.method() === "PUT" && /\/hero-slide$/.test(request.url())) requests++;
    });
    await field(dialog, "სათაური (ინგლისურად) *").fill("");
    await dialog.getByRole("button", { name: "შენახვა", exact: true }).click();
    await expect(toastWith("სათაური სამივე ენაზეა საჭირო")).toBeVisible();
    await field(dialog, "სათაური (ინგლისურად) *").fill("E2E en");
    await field(dialog, "ღილაკის ტექსტი (რუსულად) *").fill("");
    await dialog.getByRole("button", { name: "შენახვა", exact: true }).click();
    await expect(toastWith("ღილაკის ტექსტი სამივე ენაზეა საჭირო")).toBeVisible();
    expect(requests).toBe(0);
    await dialog.getByRole("button", { name: "გაუქმება", exact: true }).click();
  });

  test("პრომოკოდის სლაიდი: შექმნა ქვესათაურისა და სურათის გარეშე → მაშინვე აქტიური", async () => {
    const existing = (await getPromo("VEHICLE", marketing.ids.vehiclePromo)).heroSlideId;
    const dialog = await openPromoSlideModal(
      names.vehiclePromoCode,
      "ტრანსპორტი",
      existing == null ? "სლაიდის შექმნა" : "სლაიდის რედაქტირება",
    );
    await fillSlideForm(dialog, {
      title: [`E2E-TEST პრომო სლაიდი ${run}`, `E2E-TEST promo slide ${run}`, `E2E-TEST промо слайд ${run}`],
    });
    const saved = waitForApi(page, "PUT", new RegExp(`/api/promo-codes/${marketing.ids.vehiclePromo}/hero-slide$`));
    await submitModal(page);
    const slide = entityOf(await (await saved).json()) as unknown as Slide;
    ids.promoSlide = slide.id;
    expect(slide).toMatchObject({ type: "DISCOUNT", subtitle: null, imageUrl: null });
    expect(slide.title.ka).toBe(`E2E-TEST პრომო სლაიდი ${run}`);
    // Default button label kept.
    expect(slide.buttonLabel?.ka).toBeTruthy();
    expect((await getPromo("VEHICLE", marketing.ids.vehiclePromo)).heroSlideId).toBe(slide.id);
    // Row button flips to "edit".
    await expect(tableRow(page, names.vehiclePromoCode).getByRole("button", { name: "სლაიდის რედაქტირება" })).toBeVisible();
    // It goes live on the homepage straight away — even with no image.
    const live = (await publicSlideIds()).includes(slide.id);
    checkFinding(
      !live,
      "სლაიდი პრომოკოდიდან: შექმნისთანავე აქტიურია მთავარ გვერდზე, სურათის გარეშეც",
      `slide ${slide.id}: imageUrl=null, in /hero-slides/public=${live}`,
    );
    // The slides page says why it's held back.
    await page.goto("/admin/hero-slides");
    await expect(
      page.locator("main div[draggable]", { hasText: `E2E-TEST პრომო სლაიდი ${run}` }),
    ).toContainText("მთავარ გვერდზე არ ჩანს: სურათი არ აქვს");
  });

  test("პრომოკოდის სლაიდის რედაქტირება: ველები წინასწარ ივსება, ქვესათაური 3 ენაზე, ღილაკი, სურათი", async () => {
    const dialog = await openPromoSlideModal(names.vehiclePromoCode, "ტრანსპორტი", "სლაიდის რედაქტირება");
    await expect(field(dialog, "სათაური (ქართულად) *")).toHaveValue(`E2E-TEST პრომო სლაიდი ${run}`);
    await fillSlideForm(dialog, {
      title: [`E2E-TEST პრომო სლაიდი შეცვლილი ${run}`, `E2E-TEST promo slide edited ${run}`, `E2E-TEST промо изм ${run}`],
      subtitle: ["E2E ქვესათაური", "E2E subtitle", "E2E подзаголовок"],
      button: ["E2E ყიდვა", "E2E Buy", "E2E Купить"],
    });
    await dialog.locator('input[type="file"]').setInputFiles(testPng("promo-slide.png", [120, 0, 120], 120));
    const { imageOk } = await saveSlideWithImage(dialog, "promo-codes", marketing.ids.vehiclePromo, "სლაიდი პრომოკოდიდან");
    ids.promoSlideImageOk = imageOk ? 1 : 0;
    const slide = entityOf(await apiGet(page, `/promo-codes/${marketing.ids.vehiclePromo}/hero-slide`)) as unknown as Slide;
    expect(slide.id, "same slide updated, not a second one").toBe(ids.promoSlide);
    expect(slide.title.en).toBe(`E2E-TEST promo slide edited ${run}`);
    expect(slide.subtitle).toEqual({ ka: "E2E ქვესათაური", en: "E2E subtitle", ru: "E2E подзаголовок" });
    expect(slide.buttonLabel).toEqual({ ka: "E2E ყიდვა", en: "E2E Buy", ru: "E2E Купить" });
    if (imageOk) expect(slide.imageUrl).toBeTruthy();
  });

  test("ქვესათაურის გასუფთავება → null; სურათი რჩება", async () => {
    const dialog = await openPromoSlideModal(names.vehiclePromoCode, "ტრანსპორტი", "სლაიდის რედაქტირება");
    await expect(field(dialog, "ქვესათაური (ქართულად)")).toHaveValue("E2E ქვესათაური");
    await fillSlideForm(dialog, { subtitle: ["", "", ""] });
    await submitModal(page);
    const slide = entityOf(await apiGet(page, `/promo-codes/${marketing.ids.vehiclePromo}/hero-slide`)) as unknown as Slide;
    expect(slide.subtitle).toBeNull();
    if (ids.promoSlideImageOk) expect(slide.imageUrl).toBeTruthy();
  });

  test("მიბმული სლაიდის რედაქტირება სლაიდების გვერდიდან: კავშირი რჩება, პრომოკოდის ფორმა ახალ მნიშვნელობას აჩვენებს", async () => {
    await page.goto("/admin/hero-slides");
    const card = page.locator("main div").filter({ hasText: `E2E-TEST პრომო სლაიდი შეცვლილი ${run}` }).filter({
      has: page.getByRole("button", { name: "რედაქტირება" }),
    }).last();
    await card.getByRole("button", { name: "რედაქტირება" }).click();
    const dialog = modal(page);
    await dialog.locator("#hero-title-ka").fill(`E2E-TEST პრომო სლაიდი გვერდიდან ${run}`);
    await submitModal(page);
    const { items } = await apiGet<{ items: (Slide & { promoCode?: { id: number } | null })[] }>(page, "/hero-slides");
    const slide = items.find((item) => item.id === ids.promoSlide)!;
    expect(slide.title.ka).toBe(`E2E-TEST პრომო სლაიდი გვერდიდან ${run}`);
    expect(slide.promoCode?.id, "still linked to the promo code").toBe(marketing.ids.vehiclePromo);
    const promoDialog = await openPromoSlideModal(names.vehiclePromoCode, "ტრანსპორტი", "სლაიდის რედაქტირება");
    await expect(field(promoDialog, "სათაური (ქართულად) *")).toHaveValue(`E2E-TEST პრომო სლაიდი გვერდიდან ${run}`);
    await promoDialog.getByRole("button", { name: "გაუქმება", exact: true }).click();
  });

  test("პრომოკოდის გამორთვა: მისი სლაიდი მთავარ გვერდზე აღარ უნდა ჩანდეს", async () => {
    expect(await publicSlideIds()).toContain(ids.promoSlide);
    await page.goto("/admin/promo-codes");
    await openTab(page.locator("main"), "ტრანსპორტი");
    await tableRow(page, names.vehiclePromoCode).getByRole("button", { name: "რედაქტირება", exact: true }).click();
    const dialog = modal(page);
    await dialog.getByRole("switch").click();
    await expect(dialog.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    await submitModal(page);
    const stillLive = (await publicSlideIds()).includes(ids.promoSlide);
    checkFinding(
      !stillLive,
      "სლაიდი პრომოკოდიდან: გამორთული პრომოკოდის სლაიდი მთავარ გვერდზე კვლავ ჩანს",
      `promo ${names.vehiclePromoCode} isActive=false, slide ${ids.promoSlide} in /hero-slides/public=${stillLive}`,
    );
  });

  test("ივენთის სლაიდი: შექმნა (ქვესათაური + სურათი), რედაქტირება; ჯერ დაუწყებელი ივენთის ხილვადობა", async () => {
    type Event = { id: number; startDate: string; heroSlideId: number | null };
    const { items: events } = await apiGet<{ items: Event[] }>(page, "/bulk-discount-events");
    const event = events.find((item) => item.id === marketing.ids.event)!;
    expect(event.heroSlideId).toBeNull();
    await page.goto("/admin/bulk-discounts");
    await openTab(page.locator("main"), "ივენთები");
    const row = tableRow(page, `E2E-TEST ივენთი შეცვლილი ${marketing.run}`);
    await row.getByRole("button", { name: "სლაიდის შექმნა" }).click();
    let dialog = modal(page);
    await fillSlideForm(dialog, {
      title: [`E2E-TEST ივენთის სლაიდი ${run}`, `E2E-TEST event slide ${run}`, `E2E-TEST слайд события ${run}`],
      subtitle: ["E2E ივენთი", "E2E event", "E2E событие"],
    });
    await dialog.locator('input[type="file"]').setInputFiles(testPng("event-slide.png", [0, 120, 120], 120));
    const { slideId, imageOk } = await saveSlideWithImage(dialog, "bulk-discount-events", marketing.ids.event, "სლაიდი ივენთიდან");
    ids.eventSlide = slideId;
    const slide = entityOf(await apiGet(page, `/bulk-discount-events/${marketing.ids.event}/hero-slide`)) as unknown as Slide;
    expect(slide.subtitle?.en).toBe("E2E event");

    await row.getByRole("button", { name: "სლაიდის რედაქტირება" }).click();
    dialog = modal(page);
    await expect(field(dialog, "სათაური (ქართულად) *")).toHaveValue(`E2E-TEST ივენთის სლაიდი ${run}`);
    await field(dialog, "ღილაკის ტექსტი (ქართულად) *").fill("E2E ივენთზე");
    await submitModal(page);
    const edited = entityOf(await apiGet(page, `/bulk-discount-events/${marketing.ids.event}/hero-slide`)) as unknown as Slide;
    expect(edited.id).toBe(ids.eventSlide);
    expect(edited.buttonLabel?.ka).toBe("E2E ივენთზე");
    // Without an upload of its own the event slide falls back to the event's image.
    if (imageOk) expect(edited.imageUrl).toBeTruthy();

    // The event's discount only starts months from now (see 04-marketing).
    const startsInFuture = new Date(event.startDate) > new Date();
    const live = (await publicSlideIds()).includes(ids.eventSlide);
    checkFinding(
      !(startsInFuture && live),
      "სლაიდი ივენთიდან: ჯერ დაუწყებელი ფასდაკლების სლაიდი მთავარ გვერდზე უკვე ჩანს",
      `event starts ${event.startDate}, slide ${ids.eventSlide} in /hero-slides/public=${live}`,
    );
  });

  test("ორივე სლაიდის გამორთვა სლაიდების გვერდიდან → მთავარი გვერდიდან ქრება", async () => {
    await page.goto("/admin/hero-slides");
    for (const title of [`E2E-TEST პრომო სლაიდი გვერდიდან ${run}`, `E2E-TEST ივენთის სლაიდი ${run}`]) {
      const toggle = page.getByRole("switch", { name: `${title} — აქტიურობა` });
      if ((await toggle.getAttribute("aria-checked")) === "true") {
        const saved = waitForApi(page, "PATCH", /\/api\/hero-slides\/\d+$/);
        await toggle.click();
        expect((await saved).status()).toBe(200);
      }
    }
    const live = await publicSlideIds();
    expect(live).not.toContain(ids.promoSlide);
    expect(live).not.toContain(ids.eventSlide);
  });
});

// ===================== C. Linking a walk-in customer =====================

test.describe("სტუმრის დაკავშირება არსებულ მომხმარებელთან", () => {
  type AdminUser = {
    id: number;
    isWalkIn: boolean;
    mergedIntoUserId: number | null;
    phone: string | null;
    phoneClaimedBy?: { id: number } | null;
  };

  const uniquePhone = (offset: number) => `+9955${String(Date.now() + offset).slice(-8)}`;

  async function getUser(id: number): Promise<AdminUser> {
    return (await apiGet<{ user: AdminUser }>(page, `/users/${id}`)).user;
  }

  async function garageIds(userId: number): Promise<number[]> {
    return (await apiGet<{ items: { id: number }[] }>(page, `/users/${userId}/garage`)).items.map((item) => item.id);
  }

  async function register(first: string, last: string, phone: string) {
    const email = `e2e-test-${last.replace(/\s+/g, "-").toLowerCase()}-${run}@example.com`;
    const response = await customer.post(`${BACKEND_URL}/api/auth/register`, {
      data: { firstName: first, lastName: last, email, password: "supersecret123", phone, dateOfBirth: "1991-03-03", agreedToTerms: true },
    });
    return { response, email };
  }

  // Walk-in + one garage vehicle + one service record, through the UI.
  async function createWalkInWithHistory(lastName: string, phone: string): Promise<{ userId: number; vehicleId: number }> {
    await page.goto("/admin/service-history");
    await page.getByRole("button", { name: "+ ახალი სტუმარი მომხმარებელი" }).click();
    let dialog = modal(page);
    await dialog.locator("#walkin-first-name").fill("E2E-TEST");
    await dialog.locator("#walkin-last-name").fill(lastName);
    await pickDate(page, dialog.locator("#walkin-dob"), { year: 1988, monthsAhead: 0, day: 5 });
    await dialog.locator("#walkin-phone").fill(phone);
    const created = waitForApi(page, "POST", /\/api\/users\/walk-in$/);
    await submitModal(page, "დამატება");
    const userId = entityOf(await (await created).json()).id;

    await page.getByRole("button", { name: "+ ტრანსპორტის დამატება" }).click();
    dialog = modal(page);
    await pickSelect(page, "workshop-vehicle-catalog", 0, { search: catalog.names.model });
    await dialog.locator("#workshop-vehicle-year").fill("2024");
    const added = waitForApi(page, "POST", new RegExp(`/api/users/${userId}/garage$`));
    await submitModal(page, "დამატება");
    const vehicleId = entityOf(await (await added).json()).id;

    await page.locator("main button", { hasText: catalog.names.model }).first().click();
    await page.getByRole("button", { name: "+ სერვისის დამატება" }).click();
    dialog = modal(page);
    await pickSelect(page, "service-record-type", 0);
    await dialog.locator("#service-record-mileage").fill("5000");
    await pickDate(page, dialog.locator("#service-record-date"), "today");
    await submitModal(page);
    return { userId, vehicleId };
  }

  async function selectUserInWorkshop(query: string, rowText: string) {
    await page.goto("/admin/service-history");
    await page.locator("#service-history-user-search").fill(query);
    await page.locator("main button", { hasText: rowText }).first().click();
  }

  test("ხელით დაკავშირება: სტუმარი → რეგისტრირებული ანგარიში; გარაჟი და ისტორია გადადის", async () => {
    const target = await register("E2E-TEST", `Target ${run}`, uniquePhone(1));
    expect(target.response.status(), await target.response.text()).toBeLessThan(300);
    names.targetEmail = target.email;
    ids.targetUser = entityOf(await target.response.json()).id;

    names.walkIn1 = `სტუმარი-ბმა ${run}`;
    const walkIn = await createWalkInWithHistory(names.walkIn1, uniquePhone(2));
    ids.walkIn1 = walkIn.userId;
    ids.walkIn1Vehicle = walkIn.vehicleId;

    await page.getByRole("button", { name: "დაკავშირება არსებულ მომხმარებელთან" }).click();
    const dialog = modal(page);
    await dialog.getByPlaceholder("სახელი, გვარი, ემეილი ან ტელეფონი").fill(names.targetEmail);
    const candidate = dialog.locator("button", { hasText: names.targetEmail });
    await expect(candidate).toBeVisible({ timeout: 10_000 });
    // Picking a result only asks for confirmation (merging is irreversible):
    // "გაუქმება" merges nothing, "დაკავშირება" does.
    let mergeRequests = 0;
    const countMerges = (request: { method(): string; url(): string }) => {
      if (request.method() === "POST" && /\/merge-into\//.test(request.url())) mergeRequests++;
    };
    page.on("request", countMerges);
    await candidate.click();
    let confirm = modal(page);
    await expect(confirm).toContainText("სტუმრის დაკავშირება ანგარიშთან");
    await expect(confirm).toContainText(names.targetEmail);
    await confirm.getByRole("button", { name: "გაუქმება", exact: true }).click();
    expect(mergeRequests, "cancel sends nothing").toBe(0);
    expect((await getUser(ids.walkIn1)).mergedIntoUserId).toBeNull();

    await candidate.click();
    confirm = modal(page);
    const merged = waitForApi(page, "POST", new RegExp(`/api/users/${ids.walkIn1}/merge-into/${ids.targetUser}$`));
    await confirm.getByRole("button", { name: "დაკავშირება", exact: true }).click();
    const response = await merged;
    expect(response.status(), await response.text()).toBeLessThan(300);
    page.off("request", countMerges);
    await expect(toastWith("მომხმარებლები გაერთიანდა")).toBeVisible();

    const source = await getUser(ids.walkIn1);
    expect(source.mergedIntoUserId).toBe(ids.targetUser);
    expect(await garageIds(ids.targetUser)).toContain(ids.walkIn1Vehicle);
    expect(await garageIds(ids.walkIn1)).not.toContain(ids.walkIn1Vehicle);
    const records = await apiGet<{ items: unknown[] }>(page, `/service-records?garageVehicleId=${ids.walkIn1Vehicle}`);
    expect(records.items.length, "service history moved with the vehicle").toBe(1);
    // Target already had a phone — it isn't overwritten.
    expect((await getUser(ids.targetUser)).phone).not.toBe(source.phone);
  });

  test("შერწყმული სტუმარი: „შერწყმულია“ ბეჯი, დაკავშირების ღილაკი აღარ ჩანს; მისი ტელეფონით რეგისტრაცია უარყოფილია", async () => {
    await selectUserInWorkshop(names.walkIn1, names.walkIn1);
    await expect(page.locator("main").getByText("შერწყმულია").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "დაკავშირება არსებულ მომხმარებელთან" })).toHaveCount(0);
    const source = await getUser(ids.walkIn1);
    if (source.phone) {
      const again = await register("E2E-TEST", `Again ${run}`, source.phone);
      expect(again.response.status(), "re-registering a merged walk-in's phone is refused").toBeGreaterThanOrEqual(400);
    }
  });

  test("აკრძალული სამიზნე: სტუმრის დაკავშირება სხვა სტუმართან — შეცდომა ჩანს, არაფერი იცვლება", async () => {
    names.walkIn2 = `სტუმარი-ორი ${run}`;
    names.walkIn3 = `სტუმარი-სამი ${run}`;
    const walkIn2 = await createWalkInWithHistory(names.walkIn2, uniquePhone(3));
    ids.walkIn2 = walkIn2.userId;
    const walkIn3 = await createWalkInWithHistory(names.walkIn3, uniquePhone(4));
    ids.walkIn3 = walkIn3.userId;

    await page.getByRole("button", { name: "დაკავშირება არსებულ მომხმარებელთან" }).click();
    const dialog = modal(page);
    await dialog.getByPlaceholder("სახელი, გვარი, ემეილი ან ტელეფონი").fill(names.walkIn2);
    const candidate = dialog.locator("button", { hasText: names.walkIn2 });
    const offered = await candidate.isVisible({ timeout: 5_000 }).catch(() => false);
    checkFinding(
      !offered,
      "სტუმრის დაკავშირება: სამიზნეების სიაში სხვა სტუმრებიც ჩანს, თუმცა მათთან დაკავშირება აკრძალულია",
      `walk-in "${names.walkIn2}" offered as a merge target`,
    );
    if (offered) {
      const merged = waitForApi(page, "POST", new RegExp(`/api/users/${ids.walkIn3}/merge-into/${ids.walkIn2}$`));
      await candidate.click();
      expect((await merged).status()).toBe(400);
      await expect(page.locator("[data-sonner-toast][data-type='error']").first()).toBeVisible();
    }
    expect((await getUser(ids.walkIn3)).mergedIntoUserId).toBeNull();
    await page.keyboard.press("Escape");
  });

  test("ტელეფონით მოთხოვნა: მომხმარებელი რეგისტრირდება სტუმრის ნომრით → ადმინთან ბანერი → დადასტურება → ნომერი და ისტორია გადადის", async () => {
    const walkIn = await getUser(ids.walkIn3);
    const phone = walkIn.phone!;
    const claimant = await register("E2E-TEST", `Claimant ${run}`, phone);
    expect(claimant.response.status(), await claimant.response.text()).toBeLessThan(300);
    ids.claimant = entityOf(await claimant.response.json()).id;
    // The walk-in keeps the phone until staff confirm.
    expect((await getUser(ids.claimant)).phone).toBeNull();
    expect((await getUser(ids.walkIn3)).phoneClaimedBy?.id).toBe(ids.claimant);

    await selectUserInWorkshop(names.walkIn3, names.walkIn3);
    await expect(page.locator("main").getByText("ამ სტუმრის ტელეფონის ნომრით დარეგისტრირდა ანგარიში")).toBeVisible();
    await page.locator("main").getByRole("button", { name: "დაკავშირება", exact: true }).click();
    const confirm = modal(page);
    await expect(confirm).toContainText("სტუმრის დაკავშირება ანგარიშთან");
    const merged = waitForApi(page, "POST", new RegExp(`/api/users/${ids.walkIn3}/merge-into/${ids.claimant}$`));
    await confirm.getByRole("button", { name: "დაკავშირება", exact: true }).click();
    expect((await merged).status()).toBeLessThan(300);

    expect((await getUser(ids.walkIn3)).mergedIntoUserId).toBe(ids.claimant);
    expect((await getUser(ids.claimant)).phone, "phone transferred to the account").toBe(phone);
    expect(await garageIds(ids.claimant)).toHaveLength(1);
  });

  test("ტელეფონით მოთხოვნის ბანერი: „გაუქმება“ არაფერს აერთიანებს", async () => {
    const walkIn2 = await getUser(ids.walkIn2);
    const claimant = await register("E2E-TEST", `Claimant2 ${run}`, walkIn2.phone!);
    expect(claimant.response.status(), await claimant.response.text()).toBeLessThan(300);
    ids.claimant2 = entityOf(await claimant.response.json()).id;
    await selectUserInWorkshop(names.walkIn2, names.walkIn2);
    await page.locator("main").getByRole("button", { name: "დაკავშირება", exact: true }).click();
    await modal(page).getByRole("button", { name: "გაუქმება", exact: true }).click();
    expect((await getUser(ids.walkIn2)).mergedIntoUserId).toBeNull();
    expect((await getUser(ids.walkIn2)).phoneClaimedBy?.id).toBe(ids.claimant2);
  });

  test("Escape თარიღის კალენდარში ხურავს მხოლოდ კალენდარს, ფორმა და შეყვანილი მონაცემები რჩება", async () => {
    await page.goto("/admin/service-history");
    await page.getByRole("button", { name: "+ ახალი სტუმარი მომხმარებელი" }).click();
    const dialog = modal(page);
    await dialog.locator("#walkin-first-name").fill("E2E-TEST Esc");
    await dialog.locator("#walkin-dob").click();
    const calendar = page.locator('[role="dialog"]:visible').filter({ hasNot: page.locator("h2") });
    await expect(calendar).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(calendar).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("#walkin-first-name")).toHaveValue("E2E-TEST Esc");
    // A plain Escape with the calendar closed still closes the form.
    await dialog.locator("#walkin-first-name").focus();
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]:visible')).toHaveCount(0);
  });
});
