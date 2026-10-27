import { test, expect, type Page } from "@playwright/test";
import { modal, pickSelect, testPng } from "../helpers/admin";
import { loadState, saveState } from "../helpers/admin-state";
import { BACKEND_URL } from "../../env.js";
import { LOCALE_URL, customerPage, toastWith, type Customer } from "../helpers/customer";

// Customer garage: add from the catalog (validation, VIN), add a vehicle
// that isn't in the catalog ("ვერ ვიპოვე ჩემი ტექნიკა" — new catalog entry,
// then the same again → reuses it), photo add/change, compatible products,
// service history recorded by the workshop, delete. The "fill from VIN"
// button calls an external decoder, so VINs are typed but never decoded.

test.describe.configure({ mode: "serial", timeout: 120_000 });

type CatalogState = { ids: Record<string, number>; names: Record<string, string> };
type ProductsState = { ids: Record<string, number>; names: Record<string, string> };
type OperationsState = { ids: Record<string, number> };
type CustomerState = { run: string; customer: Customer };
type GarageVehicle = {
  id: number;
  year: number;
  vin: string | null;
  imageUrl: string | null;
  vehicleCatalog: { id: number; variant: string; brand: { name: string }; model: { name: string } };
};

let page: Page;
let catalog: CatalogState;
let products: ProductsState;
let operations: OperationsState;
let state: CustomerState;
const ids: Record<string, number> = {};

async function garage(): Promise<GarageVehicle[]> {
  const response = await page.request.get(`${BACKEND_URL}/api/users/me/garage`);
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { items: GarageVehicle[] }).items;
}

function vehicleCard(text: string) {
  // Each vehicle is one rounded card in the garage grid.
  return page.locator("main div.rounded-2xl.border").filter({ hasText: text }).first();
}

test.beforeAll(async ({ browser }) => {
  catalog = loadState<CatalogState>("catalog");
  products = loadState<ProductsState>("products");
  operations = loadState<OperationsState>("operations");
  state = loadState<CustomerState>("customer");
  page = await customerPage(browser, state.customer.email, state.customer.password);
});

test.afterAll(async () => {
  saveState("customer-garage", { ids });
  await page.close();
});

test("ცარიელი გარაჟი; დამატება კატალოგიდან — ვალიდაცია (ტექნიკა, დიაპაზონს გარეთ წელი)", async () => {
  await page.goto(`${LOCALE_URL}/account/garage`, { waitUntil: "networkidle" });
  await expect(page.getByText("თქვენს გარაჟში ტექნიკა ჯერ არ დამატებულა.")).toBeVisible();
  await page.getByRole("button", { name: "+ ტექნიკის დამატება" }).click();
  const dialog = modal(page);
  await dialog.getByRole("button", { name: "დამატება", exact: true }).click();
  await expect(dialog.getByText(/აირჩიეთ ტექნიკა კატალოგიდან|ჯერ აირჩიეთ ტექნიკის ტიპი/).first()).toBeVisible();

  await pickSelect(page, "garage-category", catalog.names.vehicleCategoryKa);
  // The catalog group's combustion entry (2019–2025).
  await pickSelect(page, "garage-catalog", 0, { search: "E2E Variant Edited" });
  await dialog.locator("#garage-pick-year").fill("1990");
  await dialog.getByRole("button", { name: "დამატება", exact: true }).click();
  const error = dialog.getByText(/მიუთითეთ სწორი წელი|არ ჯდება/).first();
  const serverError = page.locator("[data-sonner-toast][data-type='error']").first();
  await expect(error.or(serverError)).toBeVisible();
  expect(await garage()).toHaveLength(0);
});

test("დამატება კატალოგიდან: წელი + VIN → გარაჟში ჩანს", async () => {
  const dialog = modal(page);
  const entryLabel = await page.locator("#garage-catalog").innerText();
  await dialog.locator("#garage-pick-year").fill("2024");
  // The VIN field only shows when the admin turned on "VIN კოდით ველების შევსება".
  const vinShown = await dialog.locator("#garage-vin").isVisible();
  if (vinShown) await dialog.locator("#garage-vin").fill(`e2evin${state.run}`.slice(0, 17));
  await dialog.getByRole("button", { name: "დამატება", exact: true }).click();
  await expect(toastWith(page, /ტექნიკა დაემატა გარაჟში/)).toBeVisible();
  const vehicles = await garage();
  expect(vehicles).toHaveLength(1);
  expect(vehicles[0]).toMatchObject({ year: 2024 });
  if (vinShown) expect(vehicles[0].vin).toBe(`E2EVIN${state.run.toUpperCase()}`.slice(0, 17));
  else test.info().annotations.push({ type: "note", description: "VIN field hidden (setting off)" });
  expect(entryLabel).toContain(catalog.names.model);
  ids.catalogVehicle = vehicles[0].id;
  await expect(page.locator("main")).toContainText(catalog.names.model);
});

test("ფოტოს დამატება და შეცვლა", async () => {
  const card = vehicleCard(catalog.names.model);
  await card.locator('input[type="file"]').setInputFiles(testPng("garage.png", [60, 60, 200], 120));
  await expect.poll(async () => (await garage())[0].imageUrl).toBeTruthy();
  const first = (await garage())[0].imageUrl;
  await card.locator('input[type="file"]').setInputFiles(testPng("garage2.png", [200, 60, 60], 120));
  await expect.poll(async () => (await garage())[0].imageUrl).not.toBe(first);
  await expect(card.locator("img").first()).toBeVisible();
});

test("„თავსებადი პროდუქტები“ — E2E პროდუქტი (თავსებადი ამ ტექნიკასთან) ჩანს", async () => {
  await vehicleCard(catalog.names.model).getByRole("link", { name: "თავსებადი პროდუქტები" }).click();
  await page.waitForURL(/compatible-products/);
  await expect(page.locator("main")).toContainText(products.names.productKa, { timeout: 15_000 });
});

test("სერვისის ისტორია: სახელოსნოს ჩანაწერი ჩანს მომხმარებლის გარაჟში", async ({ playwright }) => {
  // The workshop (admin) records a service on this customer's vehicle.
  const admin = await playwright.request.newContext();
  const login = await admin.post(`${BACKEND_URL}/api/auth/login`, {
    data: { email: "admin@gmail.com", password: "admin123" },
  });
  expect(login.ok()).toBe(true);
  const today = new Date().toISOString().slice(0, 10);
  const created = await admin.post(`${BACKEND_URL}/api/service-records`, {
    data: {
      garageVehicleId: ids.catalogVehicle,
      serviceTypeId: operations.ids.serviceType,
      mileageKm: 4321,
      performedAt: today,
      position: "FRONT",
      filterChanged: true,
      notes: "E2E სახელოსნოს შენიშვნა",
    },
  });
  expect(created.status(), await created.text()).toBeLessThan(300);
  await admin.dispose();

  await page.goto(`${LOCALE_URL}/account/garage`, { waitUntil: "networkidle" });
  await vehicleCard(catalog.names.model).getByRole("button", { name: "სერვისის ისტორია" }).click();
  const dialog = modal(page);
  await expect(dialog).toContainText("4");
  await expect(dialog).toContainText("ფილტრიც შეიცვალა");
  await expect(dialog).toContainText("წინა");
  await dialog.getByRole("button", { name: "დახურვა" }).first().click();
});

test("„ვერ ვიპოვე ჩემი ტექნიკა“: ახალი ჩანაწერი (მარკა, მოდელი, ვარიანტი, წლები, ძრავი, საწვავი, კოლოფი)", async () => {
  await page.getByRole("button", { name: "+ ტექნიკის დამატება" }).click();
  const dialog = modal(page);
  await pickSelect(page, "garage-category", catalog.names.vehicleCategoryKa);
  await dialog.getByRole("button", { name: "ვერ ვიპოვე ჩემი ტექნიკა" }).click();
  // Required-field validation in this mode.
  await dialog.getByRole("button", { name: "დამატება", exact: true }).click();
  await expect(dialog.getByText("აირჩიეთ მარკა").first()).toBeVisible();

  await pickSelect(page, "garage-brand", catalog.names.brand);
  await pickSelect(page, "garage-model", catalog.names.model);
  // Existing catalog entries of this model are offered first.
  await expect(dialog.getByText("შესაძლოა უკვე გვაქვს თქვენი ტექნიკა კატალოგში — აირჩიეთ, თუ ემთხვევა:")).toBeVisible();
  await dialog.locator("#garage-variant").fill(`E2E Custom ${state.run}`);
  await dialog.locator("#garage-year-from").fill("2010");
  await dialog.locator("#garage-year-to").fill("2012");
  await dialog.locator("#garage-submit-year").fill("2015");
  await dialog.getByRole("button", { name: "დამატება", exact: true }).click();
  await expect(dialog.getByText("წელი არ ჯდება ზემოთ მითითებულ დიაპაზონში")).toBeVisible();
  await dialog.locator("#garage-submit-year").fill("2011");
  await dialog.locator("#garage-engine-volume").fill("700");
  await dialog.locator("#garage-engine-power").fill("70");
  await pickSelect(page, "garage-fuel-type", 0);
  await pickSelect(page, "garage-transmission-type", 0);
  await dialog.getByRole("button", { name: "დამატება", exact: true }).click();
  await expect(dialog).toHaveCount(0, { timeout: 15_000 });
  const custom = (await garage()).find((vehicle) => vehicle.vehicleCatalog.variant === `E2E Custom ${state.run}`);
  expect(custom, "custom vehicle in garage").toBeTruthy();
  expect(custom!.year).toBe(2011);
  ids.customVehicle = custom!.id;
  ids.customCatalogEntry = custom!.vehicleCatalog.id;
});

test("იგივე ტექნიკის ხელახლა შეყვანა — არსებული კატალოგის ჩანაწერი გამოიყენება", async () => {
  await page.getByRole("button", { name: "+ ტექნიკის დამატება" }).click();
  const dialog = modal(page);
  await pickSelect(page, "garage-category", catalog.names.vehicleCategoryKa);
  await dialog.getByRole("button", { name: "ვერ ვიპოვე ჩემი ტექნიკა" }).click();
  await pickSelect(page, "garage-brand", catalog.names.brand);
  await pickSelect(page, "garage-model", catalog.names.model);
  await dialog.locator("#garage-variant").fill(`E2E Custom ${state.run}`);
  await dialog.locator("#garage-year-from").fill("2010");
  await dialog.locator("#garage-year-to").fill("2012");
  await dialog.locator("#garage-submit-year").fill("2012");
  await dialog.getByRole("button", { name: "დამატება", exact: true }).click();
  await expect(dialog).toHaveCount(0, { timeout: 15_000 });
  await expect
    .poll(async () => (await garage()).filter((vehicle) => vehicle.vehicleCatalog.id === ids.customCatalogEntry).length, {
      message: "second vehicle reuses the same catalog entry",
    })
    .toBe(2);
});

test("წაშლა (დადასტურებით) — გაუქმება არაფერს შლის", async () => {
  const before = (await garage()).length;
  await page.goto(`${LOCALE_URL}/account/garage`, { waitUntil: "networkidle" });
  const card = vehicleCard("2012");
  await card.getByRole("button", { name: "წაშლა" }).click();
  await modal(page).getByRole("button", { name: "გაუქმება", exact: true }).click();
  expect((await garage()).length).toBe(before);
  await card.getByRole("button", { name: "წაშლა" }).click();
  await modal(page).getByRole("button", { name: "წაშლა", exact: true }).click();
  await expect(toastWith(page, "ტექნიკა წაიშალა გარაჟიდან")).toBeVisible();
  expect((await garage()).length).toBe(before - 1);
});
