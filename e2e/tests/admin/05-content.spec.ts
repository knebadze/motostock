import { test, expect, type Locator, type Page } from "@playwright/test";
import { loginAsAdmin } from "../helpers/auth";
import {
  apiGet,
  fillRichText,
  modal,
  openTab,
  pickSelect,
  revalidateStorefront,
  setSwitch,
  submitModal,
  testPng,
  waitForApi,
} from "../helpers/admin";
import { BACKEND_URL } from "../../env.js";
import { withDb } from "../helpers/db";
import { checkFinding, e2eRun, entityOf, loadState, saveState } from "../helpers/admin-state";

// Content group, create + edit: hero slides, homepage sections, FAQ, team,
// vacancies, banks; and the singleton pages (terms / privacy / shipping,
// company info, email templates). Singletons and homepage sections are the
// site's REAL content — each test edits them through the UI, verifies, then
// restores the original values (via the API, or the UI for sections) so the
// run leaves them as they were.

test.describe.configure({ mode: "serial", timeout: 180_000 });

type CatalogState = { ids: Record<string, number>; names: Record<string, string> };
type ClassifierState = { run: string; ids: Record<string, number> };

const run = e2eRun();
const RUN = run.toUpperCase();
let page: Page;
let catalog: CatalogState;
let classifiers: ClassifierState;
const ids: Record<string, number> = {};

test.beforeAll(async ({ browser }) => {
  catalog = loadState<CatalogState>("catalog");
  classifiers = loadState<ClassifierState>("classifiers");
  page = await browser.newPage();
  await loginAsAdmin(page);
});

test.afterAll(async () => {
  await revalidateStorefront(page);
  saveState("content", { run, ids });
  await page.close();
});

async function apiPatch(path: string, data: unknown) {
  const response = await page.request.patch(`${BACKEND_URL}/api${path}`, { data });
  expect(response.status(), `restore PATCH ${path}: ${await response.text()}`).toBe(200);
}

// A card/row inside the list that contains `text`, with its own buttons.
function itemWith(text: string): Locator {
  return page.locator("main").locator("div, tr").filter({ hasText: text }).filter({
    has: page.getByRole("button", { name: "რედაქტირება" }),
  }).last();
}

test.describe("მთავარი გვერდი", () => {
  type HeroSlide = Record<string, unknown> & { id: number; isActive: boolean; imageUrl: string | null };

  async function getSlide(id: number): Promise<HeroSlide> {
    const { items } = await apiGet<{ items: HeroSlide[] }>(page, "/hero-slides");
    return items.find((item) => item.id === id)!;
  }

  test("hero სლაიდი (ფასდაკლების ტიპი) — სათაური/ქვესათაური/ღილაკი 3 ენაზე, პოზიციები, კატეგორია/ბრენდი, სურათი; რედაქტირება", async () => {
    await page.goto("/admin/hero-slides");
    await page.getByRole("button", { name: "+ სლაიდის დამატება" }).click();
    let dialog = modal(page);
    await pickSelect(page, "hero-type", 1);
    for (const [locale, suffix] of [["ka", "სათაური"], ["en", "Title"], ["ru", "Заголовок"]]) {
      await dialog.locator(`#hero-title-${locale}`).fill(`E2E-TEST ${suffix} ${run}`);
      await dialog.locator(`#hero-subtitle-${locale}`).fill(`E2E ${suffix} sub`);
      await dialog.locator(`#hero-button-${locale}`).fill(`E2E ${suffix} btn`);
    }
    await pickSelect(page, "hero-text-position", "მარჯვნივ");
    await pickSelect(page, "hero-vertical-position", "დაბლა");
    if (await dialog.locator("#hero-discount-category").count()) {
      await pickSelect(page, "hero-discount-category", catalog.names.rootCategoryKa);
    }
    await dialog.locator("#hero-image").setInputFiles(testPng("hero.png", [40, 40, 40], 120));
    // Keep it off the live homepage.
    const toggle = dialog.getByRole("switch");
    if ((await toggle.getAttribute("aria-checked")) === "true") await toggle.click();
    const created = waitForApi(page, "POST", /\/api\/hero-slides$/);
    await submitModal(page);
    ids.heroSlide = entityOf(await (await created).json()).id;
    let slide = await getSlide(ids.heroSlide);
    const json = JSON.stringify(slide);
    expect(json).toContain(`E2E-TEST სათაური ${run}`);
    expect(json).toContain("E2E Title sub");
    expect(json).toContain("E2E Заголовок btn");
    expect(slide).toMatchObject({ isActive: false, textPosition: "RIGHT", verticalPosition: "BOTTOM" });
    expect(slide.imageUrl).toBeTruthy();

    await itemWith(`E2E-TEST სათაური ${run}`).getByRole("button", { name: "რედაქტირება" }).click();
    dialog = modal(page);
    await dialog.locator("#hero-title-ka").fill(`E2E-TEST სათაური შეცვლილი ${run}`);
    await dialog.locator("#hero-subtitle-en").fill("E2E sub edited");
    await pickSelect(page, "hero-text-position", "შუაში");
    await dialog.locator("#hero-image").setInputFiles(testPng("hero2.png", [90, 0, 0], 120));
    await submitModal(page);
    const before = slide.imageUrl;
    slide = await getSlide(ids.heroSlide);
    expect(JSON.stringify(slide)).toContain(`E2E-TEST სათაური შეცვლილი ${run}`);
    expect(JSON.stringify(slide)).toContain("E2E sub edited");
    expect(slide.textPosition).toBe("CENTER");
    expect(slide.imageUrl).not.toBe(before);
  });

  test("გვერდის სექცია — სათაური 3 ენაზე, რაოდენობა, აქტიურობა, გადაადგილება; შემდეგ აღდგენა", async () => {
    type Section = { id: number; sortOrder: number; isActive: boolean; title: Record<string, string> };
    const { items: original } = await apiGet<{ items: Section[] }>(page, "/homepage-sections");
    const sorted = [...original].sort((a, b) => a.sortOrder - b.sortOrder);
    const target = sorted[1];
    // Snapshot the real row so it's put back even if a step below fails.
    const snapshot = (
      await withDb((client) =>
        client.query(
          `SELECT "titleKa", "titleEn", "titleRu", "isActive", "itemCount", "productItemCount", "vehicleItemCount" FROM "dbo"."HomepageSection" WHERE id = $1`,
          [target.id],
        ),
      )
    ).rows[0];
    const sortSnapshot = sorted.map((item) => [item.id, item.sortOrder] as const);

    // The card is found by its active-switch label, which follows the
    // section's saved title.
    const cardFor = (titleKa: string) =>
      page
        .locator("main div")
        .filter({ has: page.getByPlaceholder("სათაური (ქართულად)") })
        .filter({ has: page.getByRole("switch", { name: `${titleKa} — აქტიურობა` }) })
        .last();

    try {
      await page.goto("/admin/hero-slides");
      await openTab(page.locator("main"), "გვერდის სექციები");
      let card = cardFor(target.title.ka);
      await card.getByPlaceholder("სათაური (ქართულად)").fill(`E2E-TEST სექცია ${run}`);
      await card.getByPlaceholder("სათაური (ინგლისურად)").fill(`E2E-TEST Section ${run}`);
      await card.getByPlaceholder("სათაური (რუსულად)").fill(`E2E-TEST Секция ${run}`);
      await card.locator('input[type="number"]').first().fill("7");
      let saved = waitForApi(page, "PATCH", new RegExp(`/api/homepage-sections/${target.id}$`));
      await card.getByRole("button", { name: "შენახვა", exact: true }).click();
      expect((await saved).status()).toBe(200);
      let { items } = await apiGet<{ items: Section[] }>(page, "/homepage-sections");
      const section = items.find((item) => item.id === target.id)!;
      expect(section.title).toEqual({ ka: `E2E-TEST სექცია ${run}`, en: `E2E-TEST Section ${run}`, ru: `E2E-TEST Секция ${run}` });
      expect(section).toMatchObject({ itemCount: 7 });

      card = cardFor(`E2E-TEST სექცია ${run}`);
      // Active toggle (optimistic, saved immediately).
      saved = waitForApi(page, "PATCH", new RegExp(`/api/homepage-sections/${target.id}$`));
      await card.getByRole("switch").click();
      expect((await saved).status()).toBe(200);
      ({ items } = await apiGet<{ items: Section[] }>(page, "/homepage-sections"));
      expect(items.find((item) => item.id === target.id)!.isActive).toBe(!target.isActive);

      // Move down one place.
      const moved = waitForApi(page, "POST", /\/api\/homepage-sections/);
      await card.getByRole("button", { name: "ქვემოთ ჩამოწევა" }).click();
      expect((await moved).status()).toBeLessThan(300);
      ({ items } = await apiGet<{ items: Section[] }>(page, "/homepage-sections"));
      const order = [...items].sort((a, b) => a.sortOrder - b.sortOrder).map((item) => item.id);
      expect(order.indexOf(target.id)).toBe(2);
    } finally {
      await withDb(async (client) => {
        await client.query(
          `UPDATE "dbo"."HomepageSection" SET "titleKa"=$2, "titleEn"=$3, "titleRu"=$4, "isActive"=$5, "itemCount"=$6, "productItemCount"=$7, "vehicleItemCount"=$8 WHERE id=$1`,
          [target.id, snapshot.titleKa, snapshot.titleEn, snapshot.titleRu, snapshot.isActive, snapshot.itemCount, snapshot.productItemCount, snapshot.vehicleItemCount],
        );
        for (const [id, sortOrder] of sortSnapshot) {
          await client.query(`UPDATE "dbo"."HomepageSection" SET "sortOrder"=$2 WHERE id=$1`, [id, sortOrder]);
        }
      });
    }
  });
});

test.describe("ინფორმაციული ერთეულები", () => {
  test("FAQ — კითხვა 3 ენაზე, პასუხი (rich text) 3 ენაზე, აქტიური; რედაქტირება", async () => {
    type Faq = Record<string, unknown> & { id: number; isActive: boolean };
    await page.goto("/admin/faq");
    await page.getByRole("button", { name: "+ კითხვის დამატება" }).click();
    let dialog = modal(page);
    await dialog.locator("#faq-question-ka").fill(`E2E-TEST კითხვა ${run}`);
    await dialog.locator("#faq-question-en").fill(`E2E-TEST Question ${run}`);
    await dialog.locator("#faq-question-ru").fill(`E2E-TEST Вопрос ${run}`);
    await fillRichText(dialog, 0, "E2E პასუხი");
    await fillRichText(dialog, 1, "E2E answer");
    await fillRichText(dialog, 2, "E2E ответ");
    const created = waitForApi(page, "POST", /\/api\/faq$/);
    await submitModal(page);
    ids.faq = entityOf(await (await created).json()).id;
    let { items } = await apiGet<{ items: Faq[] }>(page, "/faq");
    let faq = JSON.stringify(items.find((item) => item.id === ids.faq));
    expect(faq).toContain(`E2E-TEST კითხვა ${run}`);
    expect(faq).toContain("E2E answer");

    await itemWith(`E2E-TEST კითხვა ${run}`).getByRole("button", { name: "რედაქტირება" }).click();
    dialog = modal(page);
    await dialog.locator("#faq-question-ka").fill(`E2E-TEST კითხვა შეცვლილი ${run}`);
    await fillRichText(dialog, 2, "E2E ответ изм");
    await dialog.getByRole("switch").click();
    await submitModal(page);
    ({ items } = await apiGet<{ items: Faq[] }>(page, "/faq"));
    const edited = items.find((item) => item.id === ids.faq)!;
    faq = JSON.stringify(edited);
    expect(faq).toContain(`E2E-TEST კითხვა შეცვლილი ${run}`);
    expect(faq).toContain("E2E ответ изм");
    expect(edited.isActive).toBe(false);
  });

  test("გუნდის წევრი — სახელი 3 ენაზე, თანამდებობა, ფოტო, აქტიური; რედაქტირება", async () => {
    type Member = Record<string, unknown> & { id: number; imageUrl: string | null; isActive: boolean };
    await page.goto("/admin/team-members");
    await page.getByRole("button", { name: "+ წევრის დამატება" }).click();
    let dialog = modal(page);
    await dialog.locator("#team-name-ka").fill(`E2E-TEST წევრი ${run}`);
    await dialog.locator("#team-name-en").fill(`E2E-TEST Member ${run}`);
    await dialog.locator("#team-name-ru").fill(`E2E-TEST Сотрудник ${run}`);
    await pickSelect(page, "team-position", `E2E-TEST თანამდებობები შეცვლილი ${classifiers.run}`);
    await dialog.locator("#team-image").setInputFiles(testPng("member.png"));
    const created = waitForApi(page, "POST", /\/api\/team-members$/);
    await submitModal(page);
    ids.teamMember = entityOf(await (await created).json()).id;
    let { items } = await apiGet<{ items: Member[] }>(page, "/team-members");
    let member = items.find((item) => item.id === ids.teamMember)!;
    expect(JSON.stringify(member)).toContain(`E2E-TEST Member ${run}`);
    expect(JSON.stringify(member)).toContain(String(classifiers.ids.positions));
    expect(member.imageUrl).toBeTruthy();

    await itemWith(`E2E-TEST წევრი ${run}`).getByRole("button", { name: "რედაქტირება" }).click();
    dialog = modal(page);
    await dialog.locator("#team-name-ka").fill(`E2E-TEST წევრი შეცვლილი ${run}`);
    await pickSelect(page, "team-position", 0);
    await dialog.locator("#team-image").setInputFiles(testPng("member2.png", [0, 50, 150]));
    await dialog.getByRole("switch").click();
    await submitModal(page);
    const before = member.imageUrl;
    ({ items } = await apiGet<{ items: Member[] }>(page, "/team-members"));
    member = items.find((item) => item.id === ids.teamMember)!;
    expect(JSON.stringify(member)).toContain(`E2E-TEST წევრი შეცვლილი ${run}`);
    expect(member.imageUrl).not.toBe(before);
    expect(member.isActive).toBe(false);
  });

  test("ვაკანსია — სათაური 3 ენაზე, slug, აღწერა 3 ენაზე, აქტიური; რედაქტირება", async () => {
    type Vacancy = Record<string, unknown> & { id: number; slug: string; isActive: boolean };
    await page.goto("/admin/vacancies");
    await page.getByRole("button", { name: "+ ვაკანსიის დამატება" }).click();
    let dialog = modal(page);
    await dialog.locator("#vacancy-title-ka").fill(`E2E-TEST ვაკანსია ${run}`);
    await dialog.locator("#vacancy-title-en").fill(`E2E-TEST Vacancy ${run}`);
    await dialog.locator("#vacancy-title-ru").fill(`E2E-TEST Вакансия ${run}`);
    if (!(await dialog.locator("#vacancy-slug").inputValue())) {
      await dialog.locator("#vacancy-slug").fill(`e2e-test-vacancy-${run}`);
    }
    await fillRichText(dialog, 0, "E2E ვაკანსიის აღწერა");
    await fillRichText(dialog, 1, "E2E vacancy description");
    await fillRichText(dialog, 2, "E2E описание вакансии");
    const created = waitForApi(page, "POST", /\/api\/vacancies$/);
    await submitModal(page);
    ids.vacancy = entityOf(await (await created).json()).id;
    let { items } = await apiGet<{ items: Vacancy[] }>(page, "/vacancies");
    let vacancy = items.find((item) => item.id === ids.vacancy)!;
    expect(vacancy.slug).toBe(`e2e-test-vacancy-${run}`);
    expect(JSON.stringify(vacancy)).toContain("E2E vacancy description");

    await itemWith(`E2E-TEST ვაკანსია ${run}`).getByRole("button", { name: "რედაქტირება" }).click();
    dialog = modal(page);
    await dialog.locator("#vacancy-title-ka").fill(`E2E-TEST ვაკანსია შეცვლილი ${run}`);
    await dialog.locator("#vacancy-slug").fill(`e2e-test-vacancy-edited-${run}`);
    await fillRichText(dialog, 0, "E2E ვაკანსიის აღწერა შეცვლილი");
    await dialog.getByRole("switch").click();
    await submitModal(page);
    ({ items } = await apiGet<{ items: Vacancy[] }>(page, "/vacancies"));
    vacancy = items.find((item) => item.id === ids.vacancy)!;
    expect(vacancy).toMatchObject({ slug: `e2e-test-vacancy-edited-${run}`, isActive: false });
    expect(JSON.stringify(vacancy)).toContain("E2E ვაკანსიის აღწერა შეცვლილი");
  });

  test("ბანკი — key, სახელი 3 ენაზე, ლოგო, განვადება/ნაწილ-ნაწილ/აქტიური; რედაქტირება", async () => {
    type Bank = Record<string, unknown> & { id: number; key: string; logoUrl: string | null };
    await page.goto("/admin/banks");
    await page.getByRole("button", { name: "+ ბანკის დამატება" }).click();
    let dialog = modal(page);
    await dialog.locator("#bank-key").fill(`E2E${RUN}`);
    await dialog.locator("#bank-name-ka").fill(`E2E-TEST ბანკი ${run}`);
    await dialog.locator("#bank-name-en").fill(`E2E-TEST Bank ${run}`);
    await dialog.locator("#bank-name-ru").fill(`E2E-TEST Банк ${run}`);
    await dialog.locator("#bank-logo").setInputFiles(testPng("bank.png"));
    const switches = dialog.getByRole("switch");
    await expect(switches).toHaveCount(3);
    await switches.nth(0).click();
    await switches.nth(1).click();
    const created = waitForApi(page, "POST", /\/api\/banks$/);
    await submitModal(page);
    ids.bank = entityOf(await (await created).json()).id;
    let { items } = await apiGet<{ items: Bank[] }>(page, "/banks");
    let bank = items.find((item) => item.id === ids.bank)!;
    const firstSwitches = { supportsInstallment: bank.supportsInstallment, supportsSplitPayment: bank.supportsSplitPayment };
    expect(bank.key).toBe(`E2E${RUN}`);
    expect(bank.logoUrl).toBeTruthy();

    await itemWith(`E2E-TEST ბანკი ${run}`).getByRole("button", { name: "რედაქტირება" }).click();
    dialog = modal(page);
    await dialog.locator("#bank-name-ka").fill(`E2E-TEST ბანკი შეცვლილი ${run}`);
    await dialog.getByRole("switch").nth(0).click();
    await dialog.getByRole("switch").nth(1).click();
    await dialog.getByRole("switch").nth(2).click();
    await dialog.locator("#bank-logo").setInputFiles(testPng("bank2.png", [0, 90, 0]));
    await submitModal(page);
    ({ items } = await apiGet<{ items: Bank[] }>(page, "/banks"));
    const before = bank.logoUrl;
    bank = items.find((item) => item.id === ids.bank)!;
    expect(JSON.stringify(bank)).toContain(`E2E-TEST ბანკი შეცვლილი ${run}`);
    expect(bank.supportsInstallment).toBe(!firstSwitches.supportsInstallment);
    expect(bank.supportsSplitPayment).toBe(!firstSwitches.supportsSplitPayment);
    expect(bank.isActive).toBe(false);
    expect(bank.logoUrl).not.toBe(before);
  });
});

test.describe("ერთეულოვანი გვერდები (რედაქტირება + აღდგენა)", () => {
  for (const policy of [
    { path: "/admin/terms", api: "/terms", key: "terms" },
    { path: "/admin/privacy-policy", api: "/privacy-policy", key: "privacyPolicy" },
    { path: "/admin/shipping-policy", api: "/shipping-policy", key: "shippingPolicy" },
  ]) {
    test(`${policy.path} — ტექსტი 3 ენაზე`, async () => {
      type Doc = { content: { ka: string; en: string; ru: string } };
      // Read the original past the backend's in-memory cache.
      expect((await page.request.post(`${BACKEND_URL}/api/cache/clear`)).ok()).toBe(true);
      const original = (await apiGet<Record<string, Doc>>(page, policy.api))[policy.key];
      try {
        await page.goto(policy.path);
        const form = page.locator("main form");
        // All three editors mounted before typing into any of them.
        await expect(form.locator(".ProseMirror")).toHaveCount(3, { timeout: 15_000 });
        await fillRichText(form, 0, `E2E-TEST ტექსტი ${run}`);
        await fillRichText(form, 1, `E2E-TEST text ${run}`);
        await fillRichText(form, 2, `E2E-TEST текст ${run}`);
        const saved = waitForApi(page, "PATCH", new RegExp(`/api${policy.api}$`));
        await form.getByRole("button", { name: "შენახვა" }).click();
        const response = await saved;
        expect(response.status()).toBe(200);
        const sent = response.request().postDataJSON() as Doc;
        checkFinding(
          sent.content.ka.includes(`E2E-TEST ტექსტი ${run}`),
          `${policy.path}: KA ტექსტი შენახვისას დაიკარგა (rich text editor)`,
          `sent ka=${JSON.stringify(sent.content.ka)}`,
        );
        const edited = (await apiGet<Record<string, Doc>>(page, policy.api))[policy.key];
        expect(edited.content.en).toContain(`E2E-TEST text ${run}`);
        expect(edited.content.ru).toContain(`E2E-TEST текст ${run}`);
      } finally {
        await apiPatch(policy.api, { content: original.content });
      }
    });
  }

  test("კომპანიის ინფორმაცია — ყველა ველი + სამუშაო საათები + ლოგო; შემდეგ აღდგენა", async () => {
    type Company = Record<string, unknown> & {
      name: string;
      city: { id: number } | null;
      workingHours: { dayOfWeek: string; isClosed: boolean; openTime: string | null; closeTime: string | null }[];
      logoUrl: string | null;
    };
    // Read the original only after dropping the backend's in-memory cache, so
    // it reflects the DB and not a stale cached copy.
    expect((await page.request.post(`${BACKEND_URL}/api/cache/clear`)).ok()).toBe(true);
    const { companyInfo: original } = await apiGet<{ companyInfo: Company }>(page, "/company-info");
    await page.goto("/admin/company-info");
    const form = page.locator("main form");
    await form.locator("#company-name").fill(`E2E-TEST კომპანია ${run}`);
    await pickSelect(page, "company-city", `E2E-TEST ქალაქები შეცვლილი ${classifiers.run}`);
    await form.locator("#company-street").fill("E2E ქუჩა 1");
    await form.locator("#company-phone").fill("+995555000111");
    await form.locator("#company-whatsapp").fill("+995555000222");
    await form.locator("#company-email").fill("e2e-company@example.com");
    await form.locator("#company-facebook").fill("https://facebook.com/e2e");
    await form.locator("#company-instagram").fill("https://instagram.com/e2e");
    await form.locator("#company-youtube").fill("https://youtube.com/e2e");
    await form.locator("#company-tiktok").fill("https://tiktok.com/@e2e");
    await form.locator("#company-lat").fill("41.7");
    await form.locator("#company-lng").fill("44.8");
    // Sunday closed, Monday 09:30–19:15.
    const dayRows = form.locator("div").filter({ has: page.locator('input[type="time"]') });
    const sunday = dayRows.filter({ hasText: /კვირა/ }).last();
    if ((await sunday.getByRole("switch").getAttribute("aria-checked")) === "true") await sunday.getByRole("switch").click();
    const monday = dayRows.filter({ hasText: /ორშაბათი/ }).last();
    if ((await monday.getByRole("switch").getAttribute("aria-checked")) === "false") await monday.getByRole("switch").click();
    await monday.locator('input[type="time"]').nth(0).fill("09:30");
    await monday.locator('input[type="time"]').nth(1).fill("19:15");
    await form.locator('input[type="file"]').setInputFiles(testPng("company.png", [10, 10, 60], 140));
    const saved = waitForApi(page, "PATCH", /\/api\/company-info$/);
    await form.getByRole("button", { name: "შენახვა" }).click();
    expect((await saved).status()).toBe(200);
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: "კომპანიის ინფორმაცია განახლდა" })).toBeVisible();

    const { companyInfo: edited } = await apiGet<{ companyInfo: Company }>(page, "/company-info");
    expect(edited).toMatchObject({
      name: `E2E-TEST კომპანია ${run}`,
      street: "E2E ქუჩა 1",
      phone: "+995555000111",
      whatsappPhone: "+995555000222",
      email: "e2e-company@example.com",
      facebookUrl: "https://facebook.com/e2e",
      instagramUrl: "https://instagram.com/e2e",
      youtubeUrl: "https://youtube.com/e2e",
      tiktokUrl: "https://tiktok.com/@e2e",
      latitude: 41.7,
      longitude: 44.8,
    });
    expect(edited.city?.id).toBe(classifiers.ids.cities);
    expect(edited.workingHours.find((hour) => hour.dayOfWeek === "SUNDAY")?.isClosed).toBe(true);
    expect(edited.workingHours.find((hour) => hour.dayOfWeek === "MONDAY")).toMatchObject({
      isClosed: false,
      openTime: "09:30",
      closeTime: "19:15",
    });
    expect(edited.logoUrl).toBeTruthy();

    // Restore (the logo has no "remove" endpoint — put the old value back).
    await apiPatch("/company-info", {
      name: original.name,
      cityId: original.city?.id ?? null,
      street: original.street,
      phone: original.phone,
      whatsappPhone: original.whatsappPhone,
      email: original.email,
      facebookUrl: original.facebookUrl,
      instagramUrl: original.instagramUrl,
      youtubeUrl: original.youtubeUrl,
      tiktokUrl: original.tiktokUrl,
      latitude: original.latitude,
      longitude: original.longitude,
      workingHours: original.workingHours.map(({ dayOfWeek, isClosed, openTime, closeTime }) => ({
        dayOfWeek,
        isClosed,
        openTime,
        closeTime,
      })),
    });
    await withDb((client) =>
      client.query(`UPDATE "dbo"."CompanyInfo" SET "logoUrl" = $1 WHERE "singleton" = true`, [original.logoUrl]),
    );
    // The direct DB write bypasses the backend's in-memory company-info cache.
    const cleared = await page.request.post(`${BACKEND_URL}/api/cache/clear`);
    expect(cleared.ok()).toBe(true);
    const { companyInfo: restored } = await apiGet<{ companyInfo: Company }>(page, "/company-info");
    expect(restored).toMatchObject({ name: original.name, logoUrl: original.logoUrl });
  });

  test("იმეილის შაბლონი — სათაური და ტექსტი 3 ენაზე; შემდეგ აღდგენა", async () => {
    type Template = { id: number; key: string; subject: Record<string, string>; body: Record<string, string> };
    const { items } = await apiGet<{ items: Template[] }>(page, "/email-templates");
    await page.goto("/admin/email-templates");
    const panel = page.locator("main");
    // First tab = first template in the list order shown.
    const firstTabLabel = (await panel.locator("div.border-b button").first().innerText()).trim();
    const subjectKa = panel.locator('div:has(> label:text-is("სათაური (ქართულად)")) > input:visible');
    const originalSubjectKa = await subjectKa.inputValue();
    const original = items.find((item) => item.subject.ka === originalSubjectKa)!;
    expect(original, `template for tab ${firstTabLabel}`).toBeTruthy();
    await subjectKa.fill(`E2E-TEST სათაური ${run}`);
    await panel.locator('div:has(> label:text-is("სათაური (ინგლისურად)")) > input:visible').fill(`E2E-TEST subject ${run}`);
    await panel.locator('div:has(> label:text-is("სათაური (რუსულად)")) > input:visible').fill(`E2E-TEST тема ${run}`);
    await fillRichText(panel, 0, `E2E-TEST ტექსტი ${run}`);
    await fillRichText(panel, 1, `E2E-TEST body ${run}`);
    await fillRichText(panel, 2, `E2E-TEST тело ${run}`);
    const saved = waitForApi(page, "PATCH", new RegExp(`/api/email-templates/${original.id}$`));
    await panel.locator("button:visible", { hasText: /^შენახვა$/ }).click();
    expect((await saved).status()).toBe(200);
    const { items: after } = await apiGet<{ items: Template[] }>(page, "/email-templates");
    const edited = after.find((item) => item.id === original.id)!;
    expect(edited.subject).toEqual({ ka: `E2E-TEST სათაური ${run}`, en: `E2E-TEST subject ${run}`, ru: `E2E-TEST тема ${run}` });
    expect(edited.body.en).toContain(`E2E-TEST body ${run}`);
    await apiPatch(`/email-templates/${original.id}`, { subject: original.subject, body: original.body });
  });
});
