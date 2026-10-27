import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { loginAsAdmin } from "../helpers/auth";
import { apiGet, modal, pickSelectByLabel, tableRow, waitForApi } from "../helpers/admin";
import { BACKEND_URL } from "../../env.js";
import { e2eRun, entityOf, loadState, saveState } from "../helpers/admin-state";
import { withDb } from "../helpers/db";

// Orders group, edit only — orders can't be created from the admin, so a
// fresh E2E customer places two real orders through the storefront API
// (pickup + pay in store; SMTP isn't configured locally and FINA push is
// gated on unset settings, so nothing leaves the machine). The admin then,
// through the UI: moves order A through statuses, closes a cancel request
// on A without cancelling, cancels order B from its cancel request (stock
// must come back), and resolves a showroom "call me back" request.

test.describe.configure({ mode: "serial", timeout: 180_000 });

type CatalogState = { ids: Record<string, number>; names: Record<string, string> };
type ProductsState = { ids: Record<string, number>; names: Record<string, string> };
type ClassifierState = { run: string; ids: Record<string, number> };
type Order = { id: number; orderCode: string; status: { id: number; key: string; nameKa: string } };

const run = e2eRun();
let page: Page;
let customer: APIRequestContext;
let catalog: CatalogState;
let products: ProductsState;
let classifiers: ClassifierState;
const ids: Record<string, number> = {};
const codes: Record<string, string> = {};
const customerEmail = `e2e-test-${run}@example.com`;

async function customerPost(path: string, data: unknown) {
  const response = await customer.post(`${BACKEND_URL}/api${path}`, { data });
  expect(response.status(), `customer POST ${path}: ${await response.text()}`).toBeLessThan(300);
  return response.json();
}

async function variantStock(): Promise<number> {
  const { items } = await apiGet<{ items: { id: number; stockQuantity: number }[] }>(
    page,
    `/product-variants?productId=${products.ids.product}`,
  );
  return items.find((item) => item.id === products.ids.variant)!.stockQuantity;
}

async function placeOrder(): Promise<Order> {
  await customerPost("/users/me/cart", { itemType: "PRODUCT_VARIANT", productVariantId: products.ids.variant, quantity: 1 });
  const body = await customerPost("/orders/checkout", {
    deliveryMethod: "PICKUP",
    paymentMethod: "IN_STORE",
    idempotencyKey: `e2e-${run}-${Date.now()}`,
  });
  return entityOf(body) as unknown as Order;
}

async function getOrder(id: number): Promise<Order & Record<string, unknown>> {
  return entityOf(await apiGet(page, `/orders/${id}`)) as unknown as Order & Record<string, unknown>;
}

test.beforeAll(async ({ browser, playwright }) => {
  catalog = loadState<CatalogState>("catalog");
  products = loadState<ProductsState>("products");
  classifiers = loadState<ClassifierState>("classifiers");
  page = await browser.newPage();
  await loginAsAdmin(page);

  customer = await playwright.request.newContext();
  await customerPost("/auth/register", {
    firstName: "E2E-TEST",
    lastName: `Customer ${run}`,
    email: customerEmail,
    password: "supersecret123",
    phone: `+9955${String(Date.now()).slice(-8)}`,
    dateOfBirth: "1990-05-05",
    agreedToTerms: true,
  });
  // Checkout requires a verified email, and SMTP isn't configured locally —
  // mark this test fixture verified directly (the customer flow itself isn't
  // what this suite tests).
  await withDb((client) =>
    client.query(`UPDATE "dbo"."User" SET "emailVerifiedAt" = NOW() WHERE "email" = $1`, [customerEmail]),
  );
});

test.afterAll(async () => {
  saveState("orders", { run, ids, codes, customerEmail });
  await customer.dispose();
  await page.close();
});

test("მომხმარებელი აფორმებს 2 შეკვეთას (A, B); მარაგი იკლებს", async () => {
  const stockBefore = await variantStock();
  const orderA = await placeOrder();
  const orderB = await placeOrder();
  ids.orderA = orderA.id;
  ids.orderB = orderB.id;
  codes.orderA = orderA.orderCode;
  codes.orderB = orderB.orderCode;
  expect(await variantStock()).toBe(stockBefore - 2);
  ids.stockAfterOrders = stockBefore - 2;
});

async function setOrderStatusInUi(orderId: number, orderCode: string, statusKeys: string[]) {
  const { items: statuses } = await apiGet<{ items: { id: number; key: string; nameKa: string }[] }>(page, "/order-statuses");
  await page.goto("/admin/orders");
  const search = page.getByPlaceholder("კოდი, სახელი ან ელფოსტა");
  await search.fill(orderCode);
  await search.press("Enter");
  await tableRow(page, orderCode).getByRole("button", { name: "სრულად ნახვა" }).click();
  const dialog = modal(page);
  for (const key of statusKeys) {
    const status = statuses.find((item) => item.key === key)!;
    await pickSelectByLabel(page, "შეკვეთის სტატუსი", status.nameKa, dialog);
    const saved = waitForApi(page, "PATCH", new RegExp(`/api/orders/${orderId}/status$`));
    await dialog.getByRole("button", { name: "შენახვა", exact: true }).click();
    const response = await saved;
    expect(response.status(), await response.text()).toBe(200);
    expect((await getOrder(orderId)).status.key).toBe(key);
  }
  await expect(dialog.getByText("სტატუსის ისტორია")).toBeVisible();
  await dialog.getByRole("button", { name: "დახურვა" }).first().click();
}

test("შეკვეთა A — სტატუსი „დადასტურებული“ ადმინიდან", async () => {
  await setOrderStatusInUi(ids.orderA, codes.orderA, ["CONFIRMED"]);
});

test("შეკვეთა A — მომხმარებლის გაუქმების მოთხოვნა იხურება გაუქმების გარეშე (შიდა შენიშვნით)", async () => {
  await customerPost(`/orders/me/${ids.orderA}/requests`, { type: "CANCEL", reason: `E2E: გადავიფიქრე ${run}` });
  await page.goto("/admin/order-requests");
  // The card is pinned by the customer's reason text, which stays put while
  // the card's buttons change with its mode.
  const card = page.locator("main li").filter({ hasText: `E2E: გადავიფიქრე ${run}` });
  await card.getByRole("button", { name: "დახურვა გაუქმების გარეშე" }).click();
  await card.getByPlaceholder("მაგ. დავუკავშირდი, შეკვეთას ტოვებს").fill("E2E: დავუკავშირდი, შეკვეთას ტოვებს");
  const resolved = waitForApi(page, "PATCH", /\/api\/orders\/requests\/\d+\/resolve$/);
  await card.getByRole("button", { name: "მოთხოვნის დახურვა" }).click();
  const response = await resolved;
  expect(response.status(), await response.text()).toBe(200);
  expect((await getOrder(ids.orderA)).status.key).toBe("CONFIRMED");
  const body = await apiGet<Record<string, unknown>>(page, "/orders/requests?status=RESOLVED");
  const items = Object.values(body).find(Array.isArray) as Record<string, unknown>[];
  const request = items.find((item) => JSON.stringify(item).includes(codes.orderA));
  expect(request, "request resolved").toBeTruthy();
  expect(JSON.stringify(request)).toContain("E2E: დავუკავშირდი");
});

test("შეკვეთა A — „გაგზავნილი“ → „მიწოდებული“; სტატუსების ისტორიაში 3 ცვლილება", async () => {
  await setOrderStatusInUi(ids.orderA, codes.orderA, ["SHIPPED", "DELIVERED"]);
  const order = await getOrder(ids.orderA);
  const history = (order.statusHistory as { status?: { key: string }; toStatus?: { key: string } }[]) ?? [];
  expect(history.length, "status history entries").toBeGreaterThanOrEqual(3);
});

test("შეკვეთა B — გაუქმება მოთხოვნიდან (მიზეზი + შენიშვნა); მარაგი ბრუნდება", async () => {
  await customerPost(`/orders/me/${ids.orderB}/requests`, { type: "CANCEL", reason: `E2E: არასწორი ზომა ${run}` });
  await page.goto("/admin/order-requests");
  const card = page.locator("main li").filter({ hasText: `E2E: არასწორი ზომა ${run}` });
  await card.getByRole("button", { name: "შეკვეთის გაუქმება" }).click();
  await pickSelectByLabel(page, "გაუქმების მიზეზი", `E2E-TEST გაუქმების მიზეზები შეცვლილი ${classifiers.run}`, card);
  await card.locator("textarea").fill("E2E: გაუქმდა მოთხოვნით");
  const cancelled = waitForApi(page, "PATCH", /\/api\/orders\//);
  await card.getByRole("button", { name: "გაუქმების დადასტურება" }).click();
  const response = await cancelled;
  expect(response.status(), await response.text()).toBeLessThan(300);
  await expect.poll(async () => (await getOrder(ids.orderB)).status.key).toBe("CANCELLED");
  const order = await getOrder(ids.orderB);
  expect(JSON.stringify(order)).toContain("E2E: გაუქმდა მოთხოვნით");
  expect(await variantStock(), "stock restored for the cancelled order").toBe(ids.stockAfterOrders + 1);
});

test("დარეკვის თხოვნა განცხადებიდან — ადმინი ხურავს შიდა შენიშვნით", async () => {
  const body = await customerPost("/callback-requests", {
    vehicleListingId: catalog.ids.listing,
    name: `E2E-TEST დამრეკი ${run}`,
    phone: "+995555000444",
    preferredTime: "საღამოს",
    note: "E2E: მაინტერესებს",
  });
  ids.callback = entityOf(body).id;
  await page.goto("/admin/order-requests");
  await page.getByRole("button", { name: /დარეკვის თხოვნები/ }).click();
  const card = page.locator("main li").filter({ hasText: `E2E-TEST დამრეკი ${run}` });
  await card.getByPlaceholder("მაგ. დავურეკე, ხვალ მოვა შოურუმში").fill("E2E: დავურეკე");
  const resolved = waitForApi(page, "PATCH", new RegExp(`/api/callback-requests/${ids.callback}/resolve$`));
  await card.getByRole("button").last().click();
  const response = await resolved;
  expect(response.status(), await response.text()).toBe(200);
  const resolvedBody = await response.json();
  expect(JSON.stringify(resolvedBody)).toContain("RESOLVED");
  expect(JSON.stringify(resolvedBody)).toContain("E2E: დავურეკე");
});
