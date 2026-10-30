import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { modal } from "../helpers/admin";
import { checkFinding, loadState, saveState } from "../helpers/admin-state";
import { withDb } from "../helpers/db";
import { BACKEND_URL } from "../../env.js";
import { LOCALE_URL, customerPage, dismissCookieNotice, toastWith, type Customer } from "../helpers/customer";

// Cart → checkout → orders, as the customer:
//  - an unverified account can't check out;
//  - cart: add variants from the product page, header mini-cart, quantity
//    stepper, remove (with confirm);
//  - checkout: courier (saved address, standard/express), pickup, card
//    (bank), promo code (invalid / valid / removed), totals;
//  - orders: thank-you page, history, detail + status timeline, invoice,
//    reorder, cancel request, return request after delivery, stock.
// SMTP isn't configured locally and FINA push is gated off, so placing
// orders sends nothing outside.

test.describe.configure({ mode: "serial", timeout: 150_000 });

type CatalogState = { run: string; ids: Record<string, number>; names: Record<string, string> };
type ProductsState = { run: string; ids: Record<string, number>; names: Record<string, string> };
type CustomerState = { run: string; customer: Customer };
type CartItem = { id: number; quantity: number; productVariant?: { id: number; price: number } | null };
type Order = {
  id: number;
  orderCode: string;
  status: { key: string };
  deliveryMethod: string;
  paymentMethod: string;
  subtotal: number;
  discountTotal: number;
  deliveryCost: number;
  total: number;
  paymentStatus: string;
};

let page: Page;
let admin: APIRequestContext;
let catalog: CatalogState;
let products: ProductsState;
let state: CustomerState;
let productUrl: string;
const ids: Record<string, number> = {};
const codes: Record<string, string> = {};
let promoCode = "";

async function cart(): Promise<CartItem[]> {
  const response = await page.request.get(`${BACKEND_URL}/api/users/me/cart`);
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { items: CartItem[] }).items;
}

async function myOrder(id: number): Promise<Order> {
  const response = await page.request.get(`${BACKEND_URL}/api/orders/me/${id}`);
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as Record<string, Order>;
  return body.order ?? body.item ?? (Object.values(body)[0] as Order);
}

async function variantStock(variantId: number): Promise<number> {
  const { items } = (await (await admin.get(`${BACKEND_URL}/api/product-variants?productId=${products.ids.product}`)).json()) as {
    items: { id: number; stockQuantity: number }[];
  };
  return items.find((item) => item.id === variantId)!.stockQuantity;
}

async function emptyCart() {
  for (const item of await cart()) await page.request.delete(`${BACKEND_URL}/api/users/me/cart/${item.id}`);
}

async function cartWithOnly(variantId: number) {
  await emptyCart();
  const added = await page.request.post(`${BACKEND_URL}/api/users/me/cart`, {
    data: { itemType: "PRODUCT_VARIANT", productVariantId: variantId, quantity: 1 },
  });
  expect(added.status(), await added.text()).toBeLessThan(300);
}

// Picks the variant button whose price shows `price` and adds it to the cart.
async function addVariantFromProductPage(variantIndex: number) {
  await page.goto(productUrl, { waitUntil: "networkidle" });
  await dismissCookieNotice(page);
  const main = page.locator("main");
  const options = main.locator("button[aria-pressed]");
  await options.nth(variantIndex).click();
  await expect(options.nth(variantIndex)).toHaveAttribute("aria-pressed", "true");
  const added = page.waitForResponse(
    (response) => response.url().endsWith("/api/users/me/cart") && response.request().method() === "POST",
  );
  // exact: the buy-together block has its own "N-ვე კალათაში დამატება".
  await main.getByRole("button", { name: "კალათაში დამატება", exact: true }).first().click();
  expect((await added).status()).toBeLessThan(300);
}

test.beforeAll(async ({ browser, playwright }) => {
  catalog = loadState<CatalogState>("catalog");
  products = loadState<ProductsState>("products");
  state = loadState<CustomerState>("customer");
  page = await customerPage(browser, state.customer.email, state.customer.password);
  productUrl = `${LOCALE_URL}/e2e-test-root-edited-${catalog.run}/e2e-test-product-edited-${products.run}`;

  admin = await playwright.request.newContext();
  expect(
    (await admin.post(`${BACKEND_URL}/api/auth/login`, { data: { email: "admin@gmail.com", password: "admin123" } })).ok(),
  ).toBe(true);
  // An active 10% product promo code for the E2E category (fixture).
  // Fresh per run: a code is single-use per customer.
  promoCode = `E2EC${Date.now().toString(36).toUpperCase()}`.slice(0, 30);
  const today = new Date();
  const inAMonth = new Date(today.getTime() + 30 * 86_400_000);
  const promo = await admin.post(`${BACKEND_URL}/api/promo-codes`, {
    data: {
      domain: "PRODUCT",
      code: promoCode,
      categoryId: catalog.ids.rootCategory,
      discountPercent: 10,
      startDate: today.toISOString().slice(0, 10),
      endDate: inAMonth.toISOString().slice(0, 10),
      isActive: true,
    },
  });
  // 409 = already created by an earlier run of this same customer state.
  expect([200, 201, 409], await promo.text()).toContain(promo.status());
  // Fixture stock (earlier runs' orders eat into it): every variant 10,
  // except one non-discounted variant at 0 for the sold-out case.
  await withDb(async (client) => {
    const { rows } = await client.query(
      `SELECT id FROM "dbo"."ProductVariant" WHERE "productId" = $1 ORDER BY id`,
      [products.ids.product],
    );
    const soldOut = [...rows].reverse().find((row: { id: number }) => row.id !== products.ids.variant);
    await client.query(`UPDATE "dbo"."ProductVariant" SET "stockQuantity" = 10 WHERE "productId" = $1`, [products.ids.product]);
    if (soldOut) await client.query(`UPDATE "dbo"."ProductVariant" SET "stockQuantity" = 0 WHERE id = $1`, [soldOut.id]);
  });
  await emptyCart();
});

test.afterAll(async () => {
  saveState("customer-orders", { ids, codes, promoCode });
  await admin.dispose();
  await page.close();
});

test("ელფოსტის დადასტურების გარეშე შეკვეთა ბლოკირებულია", async ({ browser }) => {
  const context = await browser.newContext();
  const fresh = await context.newPage();
  const email = `e2e-test-unverified-${state.run}-${Date.now()}@example.com`;
  const register = await fresh.request.post(`${BACKEND_URL}/api/auth/register`, {
    data: {
      firstName: "E2E-TEST",
      lastName: `Unverified ${state.run}`,
      email,
      password: "supersecret123",
      phone: `+9955${String(Date.now()).slice(-8)}`,
      dateOfBirth: "1990-01-01",
      agreedToTerms: true,
    },
  });
  expect(register.status(), await register.text()).toBeLessThan(300);
  const variants = (await (await admin.get(`${BACKEND_URL}/api/product-variants?productId=${products.ids.product}`)).json()) as {
    items: { id: number; stockQuantity: number }[];
  };
  const inStock = variants.items.find((variant) => variant.stockQuantity > 0)!;
  const added = await fresh.request.post(`${BACKEND_URL}/api/users/me/cart`, {
    data: { itemType: "PRODUCT_VARIANT", productVariantId: inStock.id, quantity: 1 },
  });
  expect(added.status(), await added.text()).toBeLessThan(300);
  await fresh.goto(`${LOCALE_URL}/checkout`, { waitUntil: "networkidle" });
  const blocked =
    /verify-required/.test(fresh.url()) ||
    (await fresh.getByText(/ელფოსტის დადასტურება|დაადასტურეთ თქვენი ელფოსტა/).first().isVisible().catch(() => false));
  expect(blocked, `unverified checkout should be blocked (at ${fresh.url()})`).toBe(true);
  await context.close();
});

test.describe("კალათა", () => {
  test("პროდუქტის გვერდიდან ორი ვარიანტის დამატება; მარაგის გარეშე ვარიანტი არ ემატება; ჰედერის mini-cart", async () => {
    await emptyCart();
    const { items: variants } = (await (await admin.get(`${BACKEND_URL}/api/product-variants?productId=${products.ids.product}`)).json()) as {
      items: { id: number; stockQuantity: number; size: { nameKa: string } | null }[];
    };
    // Variant buttons are labelled by size — map each variant to its button.
    await page.goto(productUrl, { waitUntil: "networkidle" });
    const buttonLabels = await page.locator("main button[aria-pressed]").allInnerTexts();
    const indexOf = (variant: (typeof variants)[number]) =>
      // A sold-out size carries a screen-reader " — არ არის მარაგში" suffix.
      buttonLabels.findIndex((label) => variant.size && label.split(" — ")[0].trim() === variant.size.nameKa);
    const inStockIndexes = variants.filter((variant) => variant.stockQuantity > 0).map(indexOf).filter((index) => index >= 0);
    const soldOut = variants.find((variant) => variant.stockQuantity === 0);
    const soldOutIndex = soldOut ? indexOf(soldOut) : -1;
    if (soldOutIndex >= 0) {
      await page.locator("main button[aria-pressed]").nth(soldOutIndex).click();
      // The buy button (first in the buy row) is disabled / says sold out.
      const buy = page.locator("main").getByRole("button", { name: /^(კალათაში დამატება|არ არის მარაგში)$/ }).first();
      await expect(buy).toBeVisible();
      const soldOutShown = (await buy.isDisabled()) || /არ არის მარაგში/.test(await buy.innerText());
      checkFinding(soldOutShown, "პროდუქტის გვერდი: მარაგის გარეშე ვარიანტზე „კალათაში დამატება“ აქტიურია", `variant index ${soldOutIndex}`);
    }
    await addVariantFromProductPage(inStockIndexes[0]);
    await addVariantFromProductPage(inStockIndexes[1]);
    const items = await cart();
    expect(items).toHaveLength(2);
    ids.variantA = items[0].productVariant!.id;
    ids.variantB = items[1].productVariant!.id;
    const header = page.locator("header").getByRole("button", { name: /კალათა/ }).first();
    await expect(header).toContainText("2");
    await header.click();
    await expect(page.getByText(products.names.productKa).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "სრულად ნახვა" }).first()).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("კალათის გვერდი: რაოდენობის გაზრდა/შემცირება, წაშლა (გაუქმება → შენარჩუნება, დადასტურება → წაშლა)", async () => {
    await page.goto(`${LOCALE_URL}/cart`, { waitUntil: "networkidle" });
    const main = page.locator("main");
    const increase = main.getByRole("button", { name: "რაოდენობის გაზრდა" }).first();
    const updated = () =>
      page.waitForResponse((response) => /\/api\/users\/me\/cart\/\d+$/.test(response.url()) && response.request().method() === "PATCH");
    let response = updated();
    await increase.click();
    expect((await response).status()).toBeLessThan(300);
    await expect.poll(async () => Math.max(...(await cart()).map((item) => item.quantity))).toBe(2);
    response = updated();
    await main.getByRole("button", { name: "რაოდენობის შემცირება" }).first().click();
    expect((await response).status()).toBeLessThan(300);
    await expect.poll(async () => Math.max(...(await cart()).map((item) => item.quantity))).toBe(1);

    await main.getByRole("button", { name: "წაშლა" }).last().click();
    await modal(page).getByRole("button", { name: "გაუქმება", exact: true }).click();
    expect(await cart()).toHaveLength(2);
    await main.getByRole("button", { name: "წაშლა" }).last().click();
    await modal(page).getByRole("button", { name: "წაშლა", exact: true }).click();
    await expect(toastWith(page, "წაიშალა კალათიდან")).toBeVisible();
    await expect.poll(async () => (await cart()).length).toBe(1);
    await expect(main.getByText(/ჯამი/).first()).toBeVisible();
  });
});

test.describe("ერთად შეძენა", () => {
  test("„N-ვე კალათაში დამატება“ ამატებს მთავარ პროდუქტსაც და მონიშნულ კომპანიონსაც; მონიშვნის მოხსნა ამცირებს", async () => {
    await emptyCart();
    await page.goto(productUrl, { waitUntil: "networkidle" });
    const bundle = page.locator("main section, main div").filter({ has: page.getByRole("heading", { name: "ერთად შეძენა" }) }).last();
    await expect(bundle).toBeVisible();
    const addAll = bundle.getByRole("button", { name: /კალათაში დამატება/ });
    const label = await addAll.innerText();
    const count = Number(label.match(/(\d+)/)?.[1] ?? "1");
    expect(count, `bundle button "${label}"`).toBeGreaterThanOrEqual(2);
    // Untick one companion → the button counts one less.
    const companionTick = bundle.getByRole("checkbox").filter({ hasNot: page.locator("[disabled]") }).last();
    if (await companionTick.isEnabled().catch(() => false)) {
      await companionTick.uncheck();
      await expect(addAll).not.toHaveText(label);
      await companionTick.check();
      await expect(addAll).toHaveText(label);
    }
    await addAll.click();
    await expect.poll(async () => (await cart()).length).toBe(count);
    await emptyCart();
  });
});

test.describe("შეკვეთის გაფორმება", () => {
  const radio = (name: string | RegExp) => page.locator("main").getByRole("radio", { name }).first();

  test("ფასდაკლებული ნივთი კალათაში: პრომოკოდის ველი დაბლოკილია (ფასდაკლებასთან დაჯამება გამორთულია)", async () => {
    // products.ids.variant carries the active 10% discount.
    await cartWithOnly(products.ids.variant);
    await page.goto(`${LOCALE_URL}/checkout`, { waitUntil: "networkidle" });
    const main = page.locator("main");
    await expect(main.getByPlaceholder("შეიყვანეთ კოდი")).toBeDisabled();
    await expect(main.getByText(/პრომო კოდის გამოყენება შეუძლებელია/).first()).toBeVisible();
  });

  test("კურიერით: შენახული მისამართი, სტანდარტული/ექსპრესი, პრომოკოდი (არასწორი → სწორი → მოხსნა → ხელახლა), კურიერთან გადახდა", async () => {
    // A variant with no active discount, so the promo code can apply.
    const { items: variants } = (await (await admin.get(`${BACKEND_URL}/api/product-variants?productId=${products.ids.product}`)).json()) as {
      items: { id: number; stockQuantity: number }[];
    };
    const plain = variants.find((variant) => variant.id !== products.ids.variant && variant.stockQuantity > 0)!;
    await cartWithOnly(plain.id);
    const stockBefore = await variantStock(plain.id);
    ids.stockVariant = plain.id;
    ids.stockBefore = stockBefore;
    await page.goto(`${LOCALE_URL}/cart`, { waitUntil: "networkidle" });
    await page.getByRole("link", { name: "გადახდაზე გადასვლა" }).or(page.getByRole("button", { name: "გადახდაზე გადასვლა" })).first().click();
    await page.waitForURL(/\/checkout$/);
    const main = page.locator("main");
    await radio(/კურიერით მიწოდება/).check();
    await radio(/E2E ქუჩა შეცვლილი/).check();
    // Delivery speed is only offered when express delivery is configured.
    const speedShown = await radio(/სტანდარტული მიტანა/).isVisible().catch(() => false);
    if (speedShown) await radio(/სტანდარტული მიტანა/).check();
    else test.info().annotations.push({ type: "note", description: "express delivery not configured — no speed choice" });
    await radio(/გადახდა კურიერთან/).check();
    await expect(main.getByText("მიწოდება").first()).toBeVisible();

    const promoInput = main.getByPlaceholder("შეიყვანეთ კოდი");
    await promoInput.fill("NOPE-E2E-XYZ");
    await main.getByRole("button", { name: "გამოყენება" }).click();
    await expect(page.getByText(/პრომო კოდი არასწორია|ვერ მოიძებნა|არ არსებობს/).first()).toBeVisible();

    await promoInput.fill(promoCode);
    await main.getByRole("button", { name: "გამოყენება" }).click();
    await expect(page.getByText("პრომო კოდი გააქტიურდა").first()).toBeVisible();
    await expect(main.getByText("ფასდაკლება").first()).toBeVisible();
    await main.getByRole("button", { name: "წაშლა", exact: true }).first().click();
    await expect(main.getByPlaceholder("შეიყვანეთ კოდი")).toBeVisible();
    await main.getByPlaceholder("შეიყვანეთ კოდი").fill(promoCode);
    await main.getByRole("button", { name: "გამოყენება" }).click();
    await expect(page.getByText("პრომო კოდი გააქტიურდა").first()).toBeVisible();

    // Express changes the delivery line.
    const expressRadio = radio(/სწრაფი მიტანა/);
    if (speedShown && (await expressRadio.isVisible().catch(() => false))) {
      await expressRadio.check();
      await radio(/სტანდარტული მიტანა/).check();
    }

    const placed = page.waitForResponse(
      (response) => response.url().endsWith("/api/orders/checkout") && response.request().method() === "POST",
    );
    await main.getByRole("button", { name: "შეკვეთის განთავსება" }).click();
    const placedResponse = await placed;
    expect(placedResponse.status(), await placedResponse.text()).toBeLessThan(300);
    await page.waitForURL(/\/checkout\/thank-you\/\d+/);
    ids.courierOrder = Number(page.url().match(/thank-you\/(\d+)/)![1]);
    await expect(page.getByRole("heading", { name: "გმადლობთ! შეკვეთა მიღებულია" })).toBeVisible();

    const order = await myOrder(ids.courierOrder);
    codes.courierOrder = order.orderCode;
    await expect(page.locator("main")).toContainText(order.orderCode);
    expect(order).toMatchObject({ deliveryMethod: "COURIER", paymentMethod: "ON_DELIVERY" });
    expect(order.discountTotal, "promo discount applied").toBeGreaterThan(0);
    expect(order.deliveryCost).toBe(5);
    expect(await cart(), "cart emptied after ordering").toHaveLength(0);
    expect(await variantStock(ids.stockVariant)).toBe(stockBefore - 1);
  });

  test("მადლობის გვერდი → შეკვეთის დეტალები; ისტორია; ინვოისი", async () => {
    await page.goto(`${LOCALE_URL}/checkout/thank-you/${ids.courierOrder}`, { waitUntil: "networkidle" });
    await page.getByRole("link", { name: "შეკვეთის დეტალები" }).click();
    await page.waitForURL(new RegExp(`/account/orders/${ids.courierOrder}`));
    const main = page.locator("main");
    await expect(main).toContainText(codes.courierOrder);
    await expect(main).toContainText(products.names.productKa);
    await expect(main.getByText("შეკვეთის ისტორია").first()).toBeVisible();

    const download = page.waitForEvent("download");
    await main.getByRole("link", { name: "ინვოისის ჩამოტვირთვა" }).or(main.getByRole("button", { name: "ინვოისის ჩამოტვირთვა" })).first().click();
    const file = await download;
    const bytes = readFileSync(await file.path());
    expect(bytes.subarray(0, 4).toString(), "invoice is a PDF").toBe("%PDF");

    await page.goto(`${LOCALE_URL}/account/orders`, { waitUntil: "networkidle" });
    await expect(page.locator("main")).toContainText(codes.courierOrder);
  });

  test("თავიდან შეკვეთა → კალათა ივსება; მაღაზიიდან გატანა + მაღაზიაში გადახდა", async () => {
    await page.goto(`${LOCALE_URL}/account/orders/${ids.courierOrder}`, { waitUntil: "networkidle" });
    await page.locator("main").getByRole("button", { name: "თავიდან შეკვეთა" }).click();
    await expect(toastWith(page, /დაემატა კალათაში/)).toBeVisible();
    expect((await cart()).length).toBeGreaterThan(0);

    await page.goto(`${LOCALE_URL}/checkout`, { waitUntil: "networkidle" });
    await radio(/მაღაზიიდან გატანა/).check();
    await radio(/გადახდა მაღაზიაში/).check();
    // The promo code was already used on the courier order — single use.
    const promoInput = page.locator("main").getByPlaceholder("შეიყვანეთ კოდი");
    if (await promoInput.isEnabled()) {
      await promoInput.fill(promoCode);
      await page.locator("main").getByRole("button", { name: "გამოყენება" }).click();
      await expect(page.getByText("თქვენ უკვე გამოიყენეთ ეს პრომო კოდი").first()).toBeVisible();
      await promoInput.fill("");
    }
    // Courier-only payment isn't offered with pickup.
    await expect(radio(/გადახდა კურიერთან/)).toHaveCount(0);
    const placed = page.waitForResponse((response) => response.url().endsWith("/api/orders/checkout") && response.request().method() === "POST");
    await page.locator("main").getByRole("button", { name: "შეკვეთის განთავსება" }).click();
    expect((await placed).status()).toBeLessThan(300);
    await page.waitForURL(/\/checkout\/thank-you\/\d+/);
    ids.pickupOrder = Number(page.url().match(/thank-you\/(\d+)/)![1]);
    await expect(page.getByText(/მაღაზიაში მზად იქნება/).first()).toBeVisible();
    const order = await myOrder(ids.pickupOrder);
    expect(order).toMatchObject({ deliveryMethod: "PICKUP", paymentMethod: "IN_STORE", deliveryCost: 0 });
  });

  test("ბარათით გადახდა: ბანკის არჩევა სავალდებულოა; შეკვეთა გადახდის მოლოდინში", async () => {
    const { items: variants } = (await (await admin.get(`${BACKEND_URL}/api/product-variants?productId=${products.ids.product}`)).json()) as {
      items: { id: number; stockQuantity: number }[];
    };
    await cartWithOnly(variants.find((variant) => variant.stockQuantity > 0)!.id);
    await page.goto(`${LOCALE_URL}/checkout`, { waitUntil: "networkidle" });
    await radio(/მაღაზიიდან გატანა/).check();
    const card = radio(/ბარათით ონლაინ/);
    if (!(await card.isVisible().catch(() => false))) {
      test.info().annotations.push({ type: "note", description: "card payment switched off" });
      await emptyCart();
      return;
    }
    await card.check();
    const bank = radio(/საქართველოს ბანკი/);
    await expect(page.locator("main").getByText("საქართველოს ბანკი").first()).toBeVisible();
    const bankChoice = await bank.isVisible().catch(() => false);
    if (!bankChoice) {
      // A single active bank is shown as text and used automatically.
      test.info().annotations.push({ type: "note", description: "single bank — no choice to make" });
    } else if (!(await bank.isChecked())) {
      // No bank picked: placing is refused until one is chosen.
      const placeButton = page.locator("main").getByRole("button", { name: "შეკვეთის განთავსება" });
      if (await placeButton.isEnabled()) {
        await placeButton.click();
        await expect(page.getByText(/აირჩიეთ ბანკი|სრული ჯამი გამოჩნდება ბანკის არჩევის შემდეგ/).first()).toBeVisible();
      } else {
        await expect(page.getByText(/სრული ჯამი გამოჩნდება ბანკის არჩევის შემდეგ|აირჩიეთ ბანკი/).first()).toBeVisible();
      }
      await bank.check();
    } else {
      test.info().annotations.push({ type: "note", description: "the only bank is preselected" });
    }
    const placed = page.waitForResponse((response) => response.url().endsWith("/api/orders/checkout") && response.request().method() === "POST");
    await page.locator("main").getByRole("button", { name: "შეკვეთის განთავსება" }).click();
    const response = await placed;
    expect(response.status(), await response.text()).toBeLessThan(300);
    await page.waitForURL(/thank-you\/\d+/, { timeout: 15_000 }).catch(() => {});
    const match = page.url().match(/thank-you\/(\d+)/);
    const orderId = match ? Number(match[1]) : ((await response.json()) as { order?: { id: number } }).order?.id;
    expect(orderId).toBeTruthy();
    ids.cardOrder = orderId!;
    const order = await myOrder(ids.cardOrder);
    expect(order.paymentMethod).toBe("CARD");
    checkFinding(
      order.paymentStatus !== "PAID",
      "ბარათით გადახდა: შეკვეთა გადახდის გარეშე „გადახდილად“ მოინიშნა",
      `paymentStatus=${order.paymentStatus}`,
    );
    test.info().annotations.push({ type: "note", description: `card order payment status: ${order.paymentStatus} (no live gateway yet)` });
  });
});

test.describe("გაუქმება და დაბრუნება", () => {
  test("გაუქმების მოთხოვნა: მიზეზით გაგზავნა → სტატუსი ჩანს, ხელახლა გაგზავნა არ შეიძლება", async () => {
    await page.goto(`${LOCALE_URL}/account/orders/${ids.pickupOrder}`, { waitUntil: "networkidle" });
    const main = page.locator("main");
    await main.getByRole("button", { name: "გაუქმების მოთხოვნა" }).click();
    const dialog = modal(page);
    await dialog.getByPlaceholder(/მოგვწერეთ, რატომ გსურთ/).fill("E2E: გადავიფიქრე");
    await dialog.getByRole("button", { name: "მოთხოვნის გაგზავნა" }).click();
    await expect(toastWith(page, "მოთხოვნა გაიგზავნა")).toBeVisible();
    await expect(main.getByText(/გაუქმების მოთხოვნა გაგზავნილია/)).toBeVisible();
    await expect(main.getByRole("button", { name: "გაუქმების მოთხოვნა" })).toHaveCount(0);
  });

  test("დაბრუნების მოთხოვნა ხელმისაწვდომია მხოლოდ ჩაბარების შემდეგ", async () => {
    await page.goto(`${LOCALE_URL}/account/orders/${ids.courierOrder}`, { waitUntil: "networkidle" });
    await expect(page.locator("main").getByRole("button", { name: "დაბრუნების მოთხოვნა" })).toHaveCount(0);
    // The shop delivers it (admin moves the order through to DELIVERED).
    const { items: statuses } = (await (await admin.get(`${BACKEND_URL}/api/order-statuses`)).json()) as {
      items: { id: number; key: string }[];
    };
    for (const key of ["CONFIRMED", "SHIPPED", "DELIVERED"]) {
      const statusId = statuses.find((status) => status.key === key)!.id;
      const moved = await admin.patch(`${BACKEND_URL}/api/orders/${ids.courierOrder}/status`, { data: { statusId } });
      expect(moved.status(), `${key}: ${await moved.text()}`).toBe(200);
    }
    await page.reload({ waitUntil: "networkidle" });
    const main = page.locator("main");
    await expect(main.getByText(/დაბრუნება შესაძლებელია ჩაბარებიდან/).first()).toBeVisible();
    await main.getByRole("button", { name: "დაბრუნების მოთხოვნა" }).click();
    const dialog = modal(page);
    await dialog.getByPlaceholder(/მოგვწერეთ, რატომ გსურთ/).fill("E2E: არ მოერგო");
    await dialog.getByRole("button", { name: "მოთხოვნის გაგზავნა" }).click();
    await expect(toastWith(page, "მოთხოვნა გაიგზავნა")).toBeVisible();
    await expect(main.getByText(/დაბრუნების მოთხოვნა გაგზავნილია/)).toBeVisible();
    // Timeline shows every status step.
    const names = (await (await admin.get(`${BACKEND_URL}/api/order-statuses`)).json()) as {
      items: { key: string; nameKa: string }[];
    };
    for (const key of ["CONFIRMED", "SHIPPED", "DELIVERED"]) {
      const label = names.items.find((status) => status.key === key)!.nameKa;
      checkFinding(
        await main.getByText(label).first().isVisible().catch(() => false),
        "შეკვეთის დეტალები: სტატუსის ისტორიაში ნაბიჯი არ ჩანს",
        `${key} (${label})`,
      );
    }
  });
});
