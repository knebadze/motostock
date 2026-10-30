import { test, expect, type Page } from "@playwright/test";
import { checkFinding, loadState } from "../helpers/admin-state";
import { BACKEND_URL } from "../../env.js";
import { LOCALE_URL, customerPage, dismissCookieNotice, toastWith, type Customer } from "../helpers/customer";

// Wishlist and compare: add/remove from product + vehicle pages and shop
// cards, the account pages, header counters, the compare-size limit, and a
// guest's lists carried into the account on login.

test.describe.configure({ mode: "serial", timeout: 120_000 });

type CatalogState = { run: string; ids: Record<string, number>; names: Record<string, string> };
type ProductsState = { run: string; ids: Record<string, number>; names: Record<string, string> };
type CustomerState = { run: string; customer: Customer };
type CollectionItem = { id: number; product?: { id: number } | null; vehicleListing?: { id: number } | null; productId?: number | null; vehicleListingId?: number | null };

let page: Page;
let catalog: CatalogState;
let products: ProductsState;
let state: CustomerState;
let productUrl: string;
let listingUrl: string;

async function collection(kind: "wishlist" | "compare"): Promise<CollectionItem[]> {
  const response = await page.request.get(`${BACKEND_URL}/api/users/me/${kind}`);
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { items: CollectionItem[] }).items;
}

const productIdOf = (item: CollectionItem) => item.product?.id ?? item.productId ?? null;
const listingIdOf = (item: CollectionItem) => item.vehicleListing?.id ?? item.vehicleListingId ?? null;

test.beforeAll(async ({ browser }) => {
  catalog = loadState<CatalogState>("catalog");
  products = loadState<ProductsState>("products");
  state = loadState<CustomerState>("customer");
  page = await customerPage(browser, state.customer.email, state.customer.password);
  productUrl = `${LOCALE_URL}/e2e-test-root-edited-${catalog.run}/e2e-test-product-edited-${products.run}`;
  const listing = await page.request.get(`${BACKEND_URL}/api/vehicle-listings/${catalog.ids.listing}`);
  const { item } = (await listing.json()) as {
    item: { id: number; year: number; vehicleCatalog: { brand: { slug: string }; model: { slug: string }; category: { slug: string } } };
  };
  listingUrl = `${LOCALE_URL}/${item.vehicleCatalog.category.slug}/${item.vehicleCatalog.brand.slug}-${item.vehicleCatalog.model.slug}-${item.year}-${item.id}`;
  // Start from empty lists.
  for (const kind of ["wishlist", "compare"] as const) {
    for (const entry of await collection(kind)) {
      await page.request.delete(`${BACKEND_URL}/api/users/me/${kind}/${entry.id}`);
    }
  }
});

test.afterAll(async () => {
  await page.close();
});

test.describe("სასურველები", () => {
  test("პროდუქტის გვერდიდან დამატება → ღილაკი იცვლება, ჰედერის მთვლელი იზრდება", async () => {
    await page.goto(productUrl, { waitUntil: "networkidle" });
    await dismissCookieNotice(page);
    const button = page.locator("main").getByRole("button", { name: "სასურველებში დამატება" }).first();
    await button.click();
    await expect(page.locator("main").getByRole("button", { name: "სასურველებშია" }).first()).toBeVisible();
    await expect.poll(async () => (await collection("wishlist")).map(productIdOf)).toContain(products.ids.product);
    await expect(page.locator("header").getByRole("button", { name: /სასურველები/ })).toContainText("1");
  });

  test("ტრანსპორტის განცხადების დამატება სასურველებში", async () => {
    await page.goto(listingUrl, { waitUntil: "networkidle" });
    await page.locator("main").getByRole("button", { name: "სასურველებში დამატება" }).first().click();
    await expect.poll(async () => (await collection("wishlist")).map(listingIdOf)).toContain(catalog.ids.listing);
  });

  test("სასურველების გვერდი: ორივე სექცია; წაშლა", async () => {
    await page.goto(`${LOCALE_URL}/wishlist`, { waitUntil: "networkidle" });
    const main = page.locator("main");
    await expect(main.getByText("პროდუქტები").first()).toBeVisible();
    await expect(main.getByText("ტრანსპორტი").first()).toBeVisible();
    await expect(main).toContainText(products.names.productKa);
    await expect(main).toContainText(catalog.names.model);
    // Removing is the card's own heart toggle; the card leaves the page.
    await main.getByRole("button", { name: "სასურველებშია" }).first().click();
    await expect.poll(async () => (await collection("wishlist")).length).toBe(1);
    await expect(main.getByRole("button", { name: "სასურველებშია" })).toHaveCount(1);
  });

  test("პროდუქტის გვერდზე ხელახლა დაჭერა ამოიღებს (toggle)", async () => {
    await page.goto(productUrl, { waitUntil: "networkidle" });
    const saved = page.locator("main").getByRole("button", { name: "სასურველებშია" }).first();
    if (!(await saved.isVisible().catch(() => false))) {
      await page.locator("main").getByRole("button", { name: "სასურველებში დამატება" }).first().click();
      await expect(saved).toBeVisible();
    }
    await saved.click();
    await expect(page.locator("main").getByRole("button", { name: "სასურველებში დამატება" }).first()).toBeVisible();
    await expect.poll(async () => (await collection("wishlist")).map(productIdOf)).not.toContain(products.ids.product);
  });
});

test.describe("შედარება", () => {
  test("პროდუქტი და განცხადება შედარებაში; შედარების გვერდი; წაშლა", async () => {
    await page.goto(productUrl, { waitUntil: "networkidle" });
    await page.locator("main").getByRole("button", { name: "შედარებაში დამატება" }).first().click();
    await expect(page.locator("main").getByRole("button", { name: "შედარებაშია" }).first()).toBeVisible();
    await page.goto(listingUrl, { waitUntil: "networkidle" });
    await page.locator("main").getByRole("button", { name: "შედარებაში დამატება" }).first().click();
    await expect.poll(async () => (await collection("compare")).length).toBe(2);

    await page.goto(`${LOCALE_URL}/compare`, { waitUntil: "networkidle" });
    const main = page.locator("main");
    await expect(main).toContainText(products.names.productKa);
    await expect(main).toContainText(catalog.names.model);
    await expect(main.getByText("ფასი").first()).toBeVisible();
    await main.getByRole("button", { name: "წაშლა შედარებიდან" }).first().click();
    await expect.poll(async () => (await collection("compare")).length).toBe(1);
  });

  test("შედარების ლიმიტი (4): მაღაზიის ბარათებიდან დამატება ზღვრამდე, მე-5 უარყოფილია შეტყობინებით", async () => {
    for (const entry of await collection("compare")) {
      await page.request.delete(`${BACKEND_URL}/api/users/me/compare/${entry.id}`);
    }
    await page.goto(`${LOCALE_URL}/shop`, { waitUntil: "networkidle" });
    const addButtons = page.locator("main").getByRole("button", { name: "შედარებაში დამატება" });
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      const posted = page.waitForResponse(
        (response) => response.url().endsWith("/api/users/me/compare") && response.request().method() === "POST",
      );
      await addButtons.first().click();
      statuses.push((await posted).status());
      if (statuses.at(-1) === 400) break;
    }
    expect(statuses.filter((status) => status < 300)).toHaveLength(4);
    expect(statuses.at(-1)).toBe(400);
    await expect(toastWith(page, "შედარებაში ერთდროულად მაქსიმუმ 4 ერთეულის დამატებაა შესაძლებელი")).toBeVisible();
    expect((await collection("compare")).length).toBe(4);
    for (const entry of await collection("compare")) {
      await page.request.delete(`${BACKEND_URL}/api/users/me/compare/${entry.id}`);
    }
  });
});

test.describe("სტუმარი → შესვლა", () => {
  test("სტუმრის სასურველები/შედარება შესვლის შემდეგ ანგარიშზე გადადის", async ({ browser }) => {
    const guestContext = await browser.newContext();
    const guest = await guestContext.newPage();
    await guest.goto(productUrl, { waitUntil: "networkidle" });
    await dismissCookieNotice(guest);
    const wishlistButton = guest.locator("main").getByRole("button", { name: "სასურველებში დამატება" }).first();
    await wishlistButton.click();
    const redirectedToLogin = await guest.waitForURL(/\/login/, { timeout: 3_000 }).then(() => true).catch(() => false);
    if (redirectedToLogin) {
      // Guest lists are switched off — the button sends the visitor to log in.
      test.info().annotations.push({ type: "note", description: "guest wishlist disabled — redirected to login" });
      await guestContext.close();
      return;
    }
    await expect(guest.locator("main").getByRole("button", { name: "სასურველებშია" }).first()).toBeVisible();
    await guest.locator("main").getByRole("button", { name: "შედარებაში დამატება" }).first().click();

    await guest.goto(`${LOCALE_URL}/login`, { waitUntil: "networkidle" });
    await guest.fill("#email", state.customer.email);
    await guest.fill("#password", state.customer.password);
    await guest.locator('main form button[type="submit"]').click();
    await guest.waitForURL(/\/ka\/account/);
    const merged = await guest.request.get(`${BACKEND_URL}/api/users/me/wishlist`);
    const items = ((await merged.json()) as { items: CollectionItem[] }).items;
    checkFinding(
      items.map(productIdOf).includes(products.ids.product),
      "სტუმრის სასურველები შესვლისას ანგარიშზე არ გადავიდა",
      `account wishlist after login: ${JSON.stringify(items.map(productIdOf))}`,
    );
    const compare = ((await (await guest.request.get(`${BACKEND_URL}/api/users/me/compare`)).json()) as { items: CollectionItem[] }).items;
    checkFinding(
      compare.map(productIdOf).includes(products.ids.product),
      "სტუმრის შედარება შესვლისას ანგარიშზე არ გადავიდა",
      `account compare after login: ${JSON.stringify(compare.map(productIdOf))}`,
    );
    await guestContext.close();
  });
});
