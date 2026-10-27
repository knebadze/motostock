import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "../helpers/auth";
import { apiGet, modal, openTab, submitModal, tableRow, waitForApi } from "../helpers/admin";
import { e2eRun, entityOf, saveState } from "../helpers/admin-state";

// Classifier group, create + edit: every generic lookup type (vehicle,
// general, statuses pages), units, and order statuses (+ reordering).
// Runs before products — attributes pick a unit from here.

test.describe.configure({ mode: "serial", timeout: 120_000 });

const run = e2eRun();
const RUN = run.toUpperCase();
let page: Page;
const ids: Record<string, number> = {};

const LOOKUPS = [
  { page: "/admin/classifiers", slug: "fuel-types", tab: "საწვავის ტიპები" },
  { page: "/admin/classifiers", slug: "transmission-types", tab: "გადაცემათა კოლოფის ტიპები" },
  { page: "/admin/classifiers", slug: "cooling-types", tab: "გაგრილების ტიპები" },
  { page: "/admin/classifiers", slug: "final-drive-types", tab: "გადაცემის ტიპები" },
  { page: "/admin/classifiers", slug: "drive-types", tab: "წამყვანი თვლების ტიპები" },
  { page: "/admin/classifiers", slug: "start-types", tab: "გაშვების სისტემა" },
  { page: "/admin/classifiers", slug: "powertrain-types", tab: "ძრავის კვების ტიპები" },
  { page: "/admin/general-classifiers", slug: "conditions", tab: "მდგომარეობები" },
  { page: "/admin/general-classifiers", slug: "colors", tab: "ფერები" },
  { page: "/admin/general-classifiers", slug: "sizes", tab: "ზომები" },
  { page: "/admin/general-classifiers", slug: "cities", tab: "ქალაქები" },
  { page: "/admin/general-classifiers", slug: "cancellation-reasons", tab: "გაუქმების მიზეზები" },
  { page: "/admin/general-classifiers", slug: "positions", tab: "თანამდებობები" },
  { page: "/admin/statuses", slug: "listing-statuses", tab: "განცხადების სტატუსები" },
] as const;

type LookupItem = { id: number; key: string; nameKa: string; nameEn: string; nameRu: string };

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  await loginAsAdmin(page);
});

test.afterAll(async () => {
  saveState("classifiers", { run, ids });
  await page.close();
});

// The tabbed classifier pages keep every tab mounted, so the active tab's
// controls are the visible ones.
function visibleAddButton(page: Page) {
  return page.locator("button:visible", { hasText: /^\+ დამატება$/ }).first();
}

for (const [index, lookup] of LOOKUPS.entries()) {
  test(`კლასიფიკატორი „${lookup.tab}“ — შექმნა და რედაქტირება`, async () => {
    const key = `E2E_TEST_${RUN}_${index}`;
    await page.goto(lookup.page);
    await openTab(page.locator("main"), lookup.tab);
    await visibleAddButton(page).click();
    let dialog = modal(page);
    await dialog.locator("#lookup-key").fill(key.toLowerCase());
    // The key field upper-cases as you type.
    await expect(dialog.locator("#lookup-key")).toHaveValue(key);
    await dialog.locator("#lookup-name-ka").fill(`E2E-TEST ${lookup.tab} ${run}`);
    await dialog.locator("#lookup-name-en").fill(`E2E-TEST ${lookup.slug} ${run}`);
    await dialog.locator("#lookup-name-ru").fill(`E2E-TEST ру ${run}`);
    const created = waitForApi(page, "POST", new RegExp(`/api/lookups/${lookup.slug}$`));
    await submitModal(page);
    const id = entityOf(await (await created).json()).id;
    ids[lookup.slug] = id;

    let { items } = await apiGet<{ items: LookupItem[] }>(page, `/lookups/${lookup.slug}`);
    expect(items.find((item) => item.id === id)).toMatchObject({
      key,
      nameKa: `E2E-TEST ${lookup.tab} ${run}`,
      nameEn: `E2E-TEST ${lookup.slug} ${run}`,
      nameRu: `E2E-TEST ру ${run}`,
    });

    const row = tableRow(page, `E2E-TEST ${lookup.tab} ${run}`);
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "რედაქტირება" }).click();
    dialog = modal(page);
    await expect(dialog.locator("#lookup-key")).toHaveValue(key);
    await dialog.locator("#lookup-key").fill(`${key}_ED`);
    await dialog.locator("#lookup-name-ka").fill(`E2E-TEST ${lookup.tab} შეცვლილი ${run}`);
    await dialog.locator("#lookup-name-en").fill(`E2E-TEST ${lookup.slug} edited ${run}`);
    await dialog.locator("#lookup-name-ru").fill(`E2E-TEST ру изм ${run}`);
    const updated = waitForApi(page, "PATCH", new RegExp(`/api/lookups/${lookup.slug}/${id}$`));
    await submitModal(page);
    expect((await updated).status()).toBe(200);

    ({ items } = await apiGet<{ items: LookupItem[] }>(page, `/lookups/${lookup.slug}`));
    expect(items.find((item) => item.id === id)).toMatchObject({
      key: `${key}_ED`,
      nameKa: `E2E-TEST ${lookup.tab} შეცვლილი ${run}`,
      nameEn: `E2E-TEST ${lookup.slug} edited ${run}`,
      nameRu: `E2E-TEST ру изм ${run}`,
    });
    await expect(tableRow(page, `E2E-TEST ${lookup.tab} შეცვლილი ${run}`)).toBeVisible();
  });
}

test("ერთეული — შექმნა და რედაქტირება (სახელი + აბრევიატურა 3 ენაზე)", async () => {
  type Unit = { id: number; name: Record<string, string>; abbreviation: Record<string, string> };
  await page.goto("/admin/general-classifiers");
  await openTab(page.locator("main"), "ერთეულები");
  await page.getByRole("button", { name: "+ ერთეულის დამატება" }).click();
  let dialog = modal(page);
  await dialog.locator("#unit-name-ka").fill(`E2E-TEST ერთეული ${run}`);
  await dialog.locator("#unit-name-en").fill(`E2E-TEST Unit ${run}`);
  await dialog.locator("#unit-name-ru").fill(`E2E-TEST Единица ${run}`);
  await dialog.locator("#unit-abbreviation-ka").fill("ე2ე");
  await dialog.locator("#unit-abbreviation-en").fill("e2e");
  await dialog.locator("#unit-abbreviation-ru").fill("е2е");
  const created = waitForApi(page, "POST", /\/api\/units$/);
  await submitModal(page);
  ids.unit = entityOf(await (await created).json()).id;
  let { items } = await apiGet<{ items: Unit[] }>(page, "/units");
  expect(items.find((item) => item.id === ids.unit)).toMatchObject({
    name: { ka: `E2E-TEST ერთეული ${run}`, en: `E2E-TEST Unit ${run}`, ru: `E2E-TEST Единица ${run}` },
    abbreviation: { ka: "ე2ე", en: "e2e", ru: "е2е" },
  });

  await tableRow(page, `E2E-TEST ერთეული ${run}`).getByRole("button", { name: "რედაქტირება" }).click();
  dialog = modal(page);
  await dialog.locator("#unit-name-ka").fill(`E2E-TEST ერთეული შეცვლილი ${run}`);
  await dialog.locator("#unit-name-en").fill(`E2E-TEST Unit edited ${run}`);
  await dialog.locator("#unit-name-ru").fill(`E2E-TEST Единица изм ${run}`);
  await dialog.locator("#unit-abbreviation-ka").fill("ე2ე2");
  await dialog.locator("#unit-abbreviation-en").fill("e2e2");
  await dialog.locator("#unit-abbreviation-ru").fill("е2е2");
  await submitModal(page);
  ({ items } = await apiGet<{ items: Unit[] }>(page, "/units"));
  expect(items.find((item) => item.id === ids.unit)).toMatchObject({
    name: { ka: `E2E-TEST ერთეული შეცვლილი ${run}`, en: `E2E-TEST Unit edited ${run}`, ru: `E2E-TEST Единица изм ${run}` },
    abbreviation: { ka: "ე2ე2", en: "e2e2", ru: "е2е2" },
  });
});

test("შეკვეთის სტატუსი — შექმნა, რედაქტირება, გადაადგილება", async () => {
  type Status = LookupItem & { sortOrder?: number };
  await page.goto("/admin/statuses");
  await openTab(page.locator("main"), "შეკვეთის სტატუსები");
  await visibleAddButton(page).click();
  let dialog = modal(page);
  const key = `E2E_TEST_${RUN}_OS`;
  await dialog.locator("#order-status-key").fill(key);
  await dialog.locator("#order-status-name-ka").fill(`E2E-TEST სტატუსი ${run}`);
  await dialog.locator("#order-status-name-en").fill(`E2E-TEST Status ${run}`);
  await dialog.locator("#order-status-name-ru").fill(`E2E-TEST Статус ${run}`);
  const created = waitForApi(page, "POST", /\/api\/order-statuses$/);
  await submitModal(page);
  ids.orderStatus = entityOf(await (await created).json()).id;

  await tableRow(page, `E2E-TEST სტატუსი ${run}`).getByRole("button", { name: "რედაქტირება" }).click();
  dialog = modal(page);
  await dialog.locator("#order-status-key").fill(`${key}_ED`);
  await dialog.locator("#order-status-name-ka").fill(`E2E-TEST სტატუსი შეცვლილი ${run}`);
  await dialog.locator("#order-status-name-en").fill(`E2E-TEST Status edited ${run}`);
  await dialog.locator("#order-status-name-ru").fill(`E2E-TEST Статус изм ${run}`);
  await submitModal(page);
  let { items } = await apiGet<{ items: Status[] }>(page, "/order-statuses");
  expect(items.find((item) => item.id === ids.orderStatus)).toMatchObject({
    key: `${key}_ED`,
    nameKa: `E2E-TEST სტატუსი შეცვლილი ${run}`,
    nameEn: `E2E-TEST Status edited ${run}`,
    nameRu: `E2E-TEST Статус изм ${run}`,
  });

  // New statuses go last; move it up one place, then back down, so the real
  // statuses end up in their original order.
  const originalOrder = items.map((item) => item.id);
  expect(originalOrder.at(-1)).toBe(ids.orderStatus);
  const row = tableRow(page, `E2E-TEST სტატუსი შეცვლილი ${run}`);
  const reordered = waitForApi(page, "POST", /\/api\/order-statuses\/\d+\/move$/);
  await row.getByRole("button", { name: "ზემოთ აწევა" }).click();
  expect((await reordered).status()).toBeLessThan(300);
  ({ items } = await apiGet<{ items: Status[] }>(page, "/order-statuses"));
  expect(items.map((item) => item.id).at(-2)).toBe(ids.orderStatus);
  const restored = waitForApi(page, "POST", /\/api\/order-statuses\/\d+\/move$/);
  await row.getByRole("button", { name: "ქვემოთ ჩამოწევა" }).click();
  expect((await restored).status()).toBeLessThan(300);
  ({ items } = await apiGet<{ items: Status[] }>(page, "/order-statuses"));
  expect(items.map((item) => item.id)).toEqual(originalOrder);
});
