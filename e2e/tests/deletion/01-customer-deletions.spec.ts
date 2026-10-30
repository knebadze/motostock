import { test, expect, type Page } from "@playwright/test";
import { modal, testPng } from "../helpers/admin";
import { loadState } from "../helpers/admin-state";
import { BACKEND_URL } from "../../env.js";
import { LOCALE_URL, dismissCookieNotice, markEmailVerified, newCustomer, toastWith } from "../helpers/customer";

// Deletion phase, customer side — every "remove" a customer has, on a fresh
// account so nothing depends on the earlier suites' leftovers:
// address, garage vehicle (with photo), wishlist + compare from the header
// dropdowns and the compare page, cart line from the mini-cart (decrement to
// zero, unconfirmed) and from the cart page (confirmed), recent searches,
// and finally the account itself — with no orders it is really deleted
// (not anonymized) and can't log in again.
// Runs before the admin deletion spec (it still needs the E2E catalog).

test.describe.configure({ mode: "serial", timeout: 120_000 });

type CatalogState = { run: string; ids: Record<string, number>; names: Record<string, string> };
type ProductsState = { run: string; ids: Record<string, number>; names: Record<string, string> };

const customer = newCustomer(`del${Date.now().toString(36)}`, "Deleter");
let page: Page;
let catalog: CatalogState;
let products: ProductsState;

async function api<T>(path: string): Promise<T> {
  const response = await page.request.get(`${BACKEND_URL}/api${path}`);
  expect(response.ok(), path).toBe(true);
  return (await response.json()) as T;
}

async function post(path: string, data: unknown) {
  const response = await page.request.post(`${BACKEND_URL}/api${path}`, { data });
  expect(response.status(), `${path}: ${await response.text()}`).toBeLessThan(300);
  return response.json();
}

test.beforeAll(async ({ browser }) => {
  catalog = loadState<CatalogState>("catalog");
  products = loadState<ProductsState>("products");
  page = await browser.newPage();
  // Registration itself is covered by the customer suite — set up via API.
  const registered = await page.request.post(`${BACKEND_URL}/api/auth/register`, {
    data: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      password: customer.password,
      phone: customer.phone,
      dateOfBirth: "1990-02-02",
      agreedToTerms: true,
    },
  });
  expect(registered.status(), await registered.text()).toBeLessThan(300);
  // The register call already signed this context in.
  await markEmailVerified(customer.email);
});

test.afterAll(async () => {
  await page.close();
});

test("მისამართის წაშლა: გაუქმება ტოვებს, დადასტურება შლის", async () => {
  const cities = await api<{ items: { id: number }[] }>("/lookups/cities");
  await post("/users/me/addresses", {
    phone: customer.phone,
    cityId: cities.items[0]?.id,
    street: "E2E წასაშლელი ქუჩა",
  });
  await page.goto(`${LOCALE_URL}/account/address`, { waitUntil: "networkidle" });
  await dismissCookieNotice(page);
  const remove = page.locator("main").getByRole("button", { name: "წაშლა" }).first();
  await remove.click();
  await modal(page).getByText("გაუქმება", { exact: true }).click();
  expect((await api<{ addresses: unknown[] }>("/users/me/addresses")).addresses).toHaveLength(1);
  await remove.click();
  await modal(page).getByRole("button", { name: "წაშლა", exact: true }).click();
  await expect(toastWith(page, "მისამართი წაიშალა")).toBeVisible();
  expect((await api<{ addresses: unknown[] }>("/users/me/addresses")).addresses).toHaveLength(0);
  await expect(page.getByText("მისამართი ჯერ არ დაგიმატებიათ.")).toBeVisible();
});

test("გარაჟის ტექნიკის (ფოტოთი) წაშლა", async () => {
  const vehicle = await post("/users/me/garage", { vehicleCatalogId: catalog.ids.catalogEntry, year: 2022 });
  const vehicleId = (vehicle.item ?? vehicle).id as number;
  await page.request.post(`${BACKEND_URL}/api/users/me/garage/${vehicleId}/image`, {
    multipart: { image: testPng("del.png", [10, 120, 10], 100) },
  });
  await page.goto(`${LOCALE_URL}/account/garage`, { waitUntil: "networkidle" });
  const card = page.locator("main div.rounded-2xl.border").filter({ hasText: catalog.names.model }).first();
  await card.getByRole("button", { name: "წაშლა" }).click();
  await modal(page).getByRole("button", { name: "წაშლა", exact: true }).click();
  await expect(toastWith(page, "ტექნიკა წაიშალა გარაჟიდან")).toBeVisible();
  expect((await api<{ items: unknown[] }>("/users/me/garage")).items).toHaveLength(0);
  await expect(page.getByText("თქვენს გარაჟში ტექნიკა ჯერ არ დამატებულა.")).toBeVisible();
});

test("სასურველებიდან წაშლა ჰედერის dropdown-იდან", async () => {
  await post("/users/me/wishlist", { itemType: "PRODUCT", productId: products.ids.product });
  await page.goto(LOCALE_URL, { waitUntil: "networkidle" });
  await page.locator("header").getByRole("button", { name: /სასურველები/ }).first().click();
  await page.getByRole("button", { name: "წაშლა სასურველებიდან" }).first().click();
  await expect.poll(async () => (await api<{ items: unknown[] }>("/users/me/wishlist")).items.length).toBe(0);
});

test("შედარებიდან წაშლა: ჰედერის dropdown-იდან და შედარების გვერდიდან", async () => {
  await post("/users/me/compare", { itemType: "PRODUCT", productId: products.ids.product });
  await post("/users/me/compare", { itemType: "VEHICLE_LISTING", vehicleListingId: catalog.ids.listing });
  await page.goto(LOCALE_URL, { waitUntil: "networkidle" });
  await page.locator("header").getByRole("button", { name: /შედარება/ }).first().click();
  await page.getByRole("button", { name: "წაშლა შედარებიდან" }).first().click();
  await expect.poll(async () => (await api<{ items: unknown[] }>("/users/me/compare")).items.length).toBe(1);
  await page.goto(`${LOCALE_URL}/compare`, { waitUntil: "networkidle" });
  await page.locator("main").getByRole("button", { name: "წაშლა შედარებიდან" }).first().click();
  await expect.poll(async () => (await api<{ items: unknown[] }>("/users/me/compare")).items.length).toBe(0);
  await expect(page.getByText("შედარების სია ჯერ ცარიელია.")).toBeVisible();
});

test("კალათა: mini-cart-ში ნულამდე შემცირება შლის (დადასტურების გარეშე); კალათის გვერდზე წაშლა დადასტურებით", async () => {
  const { item } = await api<{ item: { variants: { id: number; stockQuantity: number }[] } }>(
    `/products/by-slug/e2e-test-product-edited-${products.run}`,
  );
  const variants = item.variants;
  const variant = variants.find((item) => item.stockQuantity > 0);
  expect(variant, "an in-stock variant").toBeTruthy();
  await post("/users/me/cart", { itemType: "PRODUCT_VARIANT", productVariantId: variant!.id, quantity: 1 });

  await page.goto(LOCALE_URL, { waitUntil: "networkidle" });
  await page.locator("header").getByRole("button", { name: /კალათა/ }).first().click();
  await page.getByRole("button", { name: "რაოდენობის შემცირება" }).first().click();
  await expect.poll(async () => (await api<{ items: unknown[] }>("/users/me/cart")).items.length).toBe(0);
  await page.keyboard.press("Escape");

  await post("/users/me/cart", { itemType: "PRODUCT_VARIANT", productVariantId: variant!.id, quantity: 1 });
  await page.goto(`${LOCALE_URL}/cart`, { waitUntil: "networkidle" });
  await page.locator("main").getByRole("button", { name: "წაშლა" }).first().click();
  await modal(page).getByRole("button", { name: "წაშლა", exact: true }).click();
  await expect(toastWith(page, "წაიშალა კალათიდან")).toBeVisible();
  expect((await api<{ items: unknown[] }>("/users/me/cart")).items).toHaveLength(0);
  await expect(page.getByText("კალათა ცარიელია.").first()).toBeVisible();
});

test("ბოლო ძიებების გასუფთავება", async () => {
  await page.goto(`${LOCALE_URL}/search?q=${encodeURIComponent("E2E წასაშლელი ძიება")}`, { waitUntil: "networkidle" });
  await page.goto(LOCALE_URL, { waitUntil: "networkidle" });
  const search = page.locator("header").getByRole("combobox", { name: "ძიება" }).first();
  await search.fill("E2E წასაშლელი ძიება");
  await search.press("Enter");
  await page.waitForURL(/\/search\?/);
  await page.goto(LOCALE_URL, { waitUntil: "networkidle" });
  await page.locator("header").getByRole("combobox", { name: "ძიება" }).first().click();
  const recent = page.locator('[role="listbox"][aria-label="ბოლო ძიებები"]');
  await expect(recent).toContainText("E2E წასაშლელი ძიება");
  await page.getByRole("button", { name: "გასუფთავება" }).filter({ hasNotText: /^$/ }).last().click();
  await expect(recent).toHaveCount(0);
});

test("ანგარიშის წაშლა შეკვეთების გარეშე: სრულად იშლება (ანონიმიზაციის გარეშე), შესვლა აღარ შეიძლება", async () => {
  await page.goto(`${LOCALE_URL}/account/profile`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "ანგარიშის წაშლა" }).first().click();
  const dialog = modal(page);
  // Cancel keeps the account.
  await dialog.getByText("გაუქმება", { exact: true }).click();
  expect((await page.request.get(`${BACKEND_URL}/api/users/me`)).ok()).toBe(true);

  await page.getByRole("button", { name: "ანგარიშის წაშლა" }).first().click();
  await modal(page).locator("#delete-password").fill(customer.password);
  const deleted = page.waitForResponse((response) => response.url().endsWith("/api/users/me") && response.request().method() === "DELETE");
  await modal(page).getByRole("button", { name: "სამუდამოდ წაშლა" }).click();
  const response = await deleted;
  expect(response.status(), await response.text()).toBe(200);
  expect(((await response.json()) as { anonymized: boolean }).anonymized, "no orders → hard delete").toBe(false);
  await expect(toastWith(page, "ანგარიში წაიშალა")).toBeVisible();
  await expect(page.locator("header")).toContainText("შესვლა");
  const login = await page.request.post(`${BACKEND_URL}/api/auth/login`, {
    data: { email: customer.email, password: customer.password },
  });
  expect(login.status()).toBeGreaterThanOrEqual(400);
  // Re-registering the same email works again (the old row is gone).
  const again = await page.request.post(`${BACKEND_URL}/api/auth/register`, {
    data: { ...customer, firstName: "E2E-TEST", dateOfBirth: "1990-02-02", agreedToTerms: true, phone: `+9955${String(Date.now()).slice(-8)}` },
  });
  expect(again.status(), await again.text()).toBeLessThan(300);
});
