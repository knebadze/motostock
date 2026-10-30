import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { loginAsOperator } from "../helpers/auth";
import { apiGet, modal, pickDate, pickSelect, pickSelectByLabel, submitModal, tableRow, waitForApi } from "../helpers/admin";
import { BACKEND_URL, BASE_URL } from "../../env.js";
import { e2eRun, entityOf, loadState } from "../helpers/admin-state";
import { withDb } from "../helpers/db";

// OPERATOR role (seed operator@gmail.com — cashier/foreman). Its permissions
// live in 4 layers that must agree: backend requireRole, frontend proxy.ts
// allow-list, the sidebar (config/admin-nav.tsx allowedRoles) and per-screen
// UI gating. This spec checks each layer, then runs the operator's real
// workflows: order status change, callback request, and the full workshop
// flow (service type → walk-in → garage vehicle → service record, edited and
// deleted). Runs after tests/admin + tests/customer (uses their catalog and
// product), before tests/deletion.

test.describe.configure({ mode: "serial", timeout: 180_000 });

type State = { run: string; ids: Record<string, number>; names: Record<string, string> };

const API = `${BACKEND_URL}/api`;
const run = e2eRun();
let page: Page;
let customer: APIRequestContext;
let catalog: State;
let products: State;
const ids: Record<string, number> = {};
const names = {
  serviceType: `E2E-TEST ოპერატორის სერვისი ${run}`,
  walkInFirst: "E2E-TEST",
  walkInLast: `ოპერატორის სტუმარი ${run}`,
  orderCode: "",
};

// Mirrors frontend/src/proxy.ts OPERATOR_ALLOWED_PATHS.
const ALLOWED_PAGES = [
  "/admin",
  "/admin/analytics",
  "/admin/products",
  "/admin/vehicle-listings",
  "/admin/service-history",
  "/admin/service-types",
  "/admin/fina-sync",
  "/admin/orders",
  "/admin/order-requests",
  "/admin/users",
  "/admin/bulk-discounts",
  "/admin/promo-codes",
  "/admin/compatibility",
  "/admin/buy-together",
  "/admin/tags",
  "/admin/change-password",
];
// Every other admin page (app/admin/(protected)/*), incl. product create/edit.
const FORBIDDEN_PAGES = [
  "/admin/visitors",
  "/admin/categories",
  "/admin/scheduled-jobs",
  "/admin/brands",
  "/admin/models",
  "/admin/vehicle-catalog",
  "/admin/vehicle-category-filters",
  "/admin/products/new",
  "/admin/product-brands",
  "/admin/attributes",
  "/admin/category-filters",
  "/admin/general-classifiers",
  "/admin/classifiers",
  "/admin/statuses",
  "/admin/hero-slides",
  "/admin/newsletter",
  "/admin/banks",
  "/admin/fraud",
  "/admin/sessions",
  "/admin/error-logs",
  "/admin/company-info",
  "/admin/team-members",
  "/admin/terms",
  "/admin/privacy-policy",
  "/admin/shipping-policy",
  "/admin/faq",
  "/admin/vacancies",
  "/admin/email-templates",
  "/admin/settings",
];
// Sidebar = allowed pages minus change-password (that one lives in the user menu).
const SIDEBAR_HREFS = ALLOWED_PAGES.filter((href) => href !== "/admin/change-password");

// ADMIN-only endpoints: the operator must get 403 (role check runs before
// validation and lookup, so ids/bodies don't need to be real).
const FORBIDDEN_API: [method: "GET" | "POST" | "PATCH" | "DELETE", path: string][] = [
  ["POST", "/categories"],
  ["PATCH", "/categories/1"],
  ["DELETE", "/categories/999999"],
  ["GET", "/settings"],
  ["PATCH", "/settings"],
  ["POST", "/banks"],
  ["DELETE", "/banks/999999"],
  ["POST", "/products"],
  ["PATCH", "/products/1"],
  ["DELETE", "/products/999999"],
  ["POST", "/product-variants"],
  ["PATCH", "/product-variants/1"],
  ["POST", "/products/1/buy-together"],
  ["POST", "/tags"],
  ["PATCH", "/tags/1"],
  ["DELETE", "/tags/999999"],
  ["POST", "/promo-codes"],
  ["PATCH", "/promo-codes/1"],
  ["POST", "/bulk-discounts/apply"],
  ["PATCH", "/bulk-discount-events/1"],
  ["DELETE", "/bulk-discount-events/999999"],
  ["POST", "/hero-slides"],
  ["PATCH", "/company-info"],
  ["GET", "/error-logs"],
  ["GET", "/sessions"],
  ["GET", "/fraud/flags"],
  ["POST", "/brands"],
  ["POST", "/vehicle-catalog"],
  ["POST", "/vehicle-listings"],
  ["PATCH", "/vehicle-listings/1"],
  ["POST", "/attributes"],
  ["POST", "/order-statuses"],
  ["POST", "/newsletter-campaigns"],
  ["POST", "/team-members"],
  ["POST", "/faq"],
  ["POST", "/cache/clear"],
  ["GET", "/scheduled-jobs"],
];

async function call(method: string, path: string, data: unknown = {}) {
  return page.request.fetch(`${API}${path}`, { method, data: method === "GET" ? undefined : data });
}

async function customerPost(path: string, data: unknown) {
  const response = await customer.post(`${API}${path}`, { data });
  expect(response.status(), `customer POST ${path}: ${await response.text()}`).toBeLessThan(300);
  return response.json();
}

test.beforeAll(async ({ browser, playwright }) => {
  catalog = loadState<State>("catalog");
  products = loadState<State>("products");
  page = await browser.newPage();
  await loginAsOperator(page);

  // A fresh customer with one real order (pickup + pay in store) for the
  // order workflow below.
  customer = await playwright.request.newContext();
  const email = `e2e-test-op-${run}@example.com`;
  await customerPost("/auth/register", {
    firstName: "E2E-TEST",
    lastName: `ოპერატორის კლიენტი ${run}`,
    email,
    password: "supersecret123",
    phone: `+9955${String(Date.now()).slice(-8)}`,
    dateOfBirth: "1990-06-06",
    agreedToTerms: true,
  });
  const variantId = await withDb(async (client) => {
    await client.query(`UPDATE "dbo"."User" SET "emailVerifiedAt" = NOW() WHERE "email" = $1`, [email]);
    const { rows } = await client.query(
      `SELECT id FROM "dbo"."ProductVariant" WHERE "productId" = $1 ORDER BY id LIMIT 1`,
      [products.ids.product],
    );
    await client.query(`UPDATE "dbo"."ProductVariant" SET "stockQuantity" = GREATEST("stockQuantity", 5) WHERE id = $1`, [rows[0].id]);
    return rows[0].id as number;
  });
  await customerPost("/users/me/cart", { itemType: "PRODUCT_VARIANT", productVariantId: variantId, quantity: 1 });
  const order = entityOf(
    await customerPost("/orders/checkout", {
      deliveryMethod: "PICKUP",
      paymentMethod: "IN_STORE",
      idempotencyKey: `e2e-op-${run}-${Date.now()}`,
    }),
  ) as unknown as { id: number; orderCode: string };
  ids.order = order.id;
  names.orderCode = order.orderCode;
});

test.afterAll(async () => {
  await customer.dispose();
  await page.close();
});

test.describe("უფლებების საზღვრები", () => {
  test("შესვლის შემდეგ — ოპერატორის სესია და დეშბორდი", async () => {
    const { user } = await apiGet<{ user: { role: string; email: string } }>(page, "/users/me");
    expect(user).toMatchObject({ role: "OPERATOR", email: "operator@gmail.com" });
    expect(new URL(page.url()).pathname).toBe("/admin");
  });

  test("გვერდითა მენიუ — მხოლოდ ოპერატორის 15 პუნქტი", async () => {
    await page.goto("/admin", { waitUntil: "networkidle" });
    const hrefs = await page
      .locator("aside nav a[href^='/admin']")
      .evaluateAll((links) => links.map((link) => new URL((link as HTMLAnchorElement).href).pathname));
    expect([...new Set(hrefs)].sort()).toEqual([...SIDEBAR_HREFS].sort());
  });

  test("დაშვებული გვერდები იხსნება, გადამისამართებისა და შეცდომის გარეშე", async () => {
    for (const path of ALLOWED_PAGES) {
      await page.goto(path, { waitUntil: "networkidle" });
      expect(new URL(page.url()).pathname, `${path} stays`).toBe(path);
      await expect(page.locator("main"), path).toBeVisible();
      await expect(page.getByText("შეფერხება მოხდა"), `${path} error boundary`).toHaveCount(0);
    }
  });

  test("აკრძალული გვერდები (პირდაპირი URL-ითაც) → გადამისამართება დეშბორდზე", async () => {
    const productId = products.ids.product;
    for (const path of [...FORBIDDEN_PAGES, `/admin/products/${productId}`]) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(new URL(page.url()).pathname, `${path} → /admin`).toBe("/admin");
      expect(response?.status(), path).toBeLessThan(400);
    }
  });

  test("API — ADMIN-only endpoint-ები ოპერატორს 403-ით უარყოფს", async () => {
    const wrong: string[] = [];
    for (const [method, path] of FORBIDDEN_API) {
      const response = await call(method, path);
      if (response.status() !== 403) wrong.push(`${method} ${path} → ${response.status()}`);
    }
    expect(wrong, "endpoints not returning 403").toEqual([]);
  });

  test("API — ოპერატორის endpoint-ები ხელმისაწვდომია", async () => {
    for (const path of [
      "/orders",
      "/orders/requests",
      "/users",
      "/service-types",
      "/tags",
      "/compatibility",
      "/product-buy-together",
      "/fina-sync/runs",
      "/analytics/overview",
      `/orders/${ids.order}`,
    ]) {
      const response = await call("GET", path);
      expect(response.status(), `GET ${path}: ${await response.text()}`).toBe(200);
    }
  });

  test("მხოლოდ სანახავი ეკრანები: დამატების/რედაქტირების/წაშლის ღილაკები არ ჩანს", async () => {
    for (const path of ["/admin/products", "/admin/vehicle-listings", "/admin/tags", "/admin/promo-codes", "/admin/bulk-discounts"]) {
      await page.goto(path, { waitUntil: "networkidle" });
      const main = page.locator("main");
      await expect(main.locator("button:visible").filter({ hasText: /^\s*\+/ }), `${path}: create button`).toHaveCount(0);
      await expect(main.getByRole("button", { name: "რედაქტირება", exact: true }), `${path}: edit`).toHaveCount(0);
      await expect(main.getByRole("button", { name: "წაშლა", exact: true }), `${path}: delete`).toHaveCount(0);
    }
    // The product list really loaded (so "no buttons" isn't just an empty page).
    await page.goto("/admin/products", { waitUntil: "networkidle" });
    await expect(page.locator("main table tbody tr").first()).toBeVisible();
  });

  test("სახელოსნოს ეკრანებზე დამატების ღილაკები ჩანს", async () => {
    await page.goto("/admin/service-types", { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: "+ სერვისის ტიპის დამატება" })).toBeVisible();
    await page.goto("/admin/service-history", { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: "+ ახალი სტუმარი მომხმარებელი" })).toBeVisible();
  });

  test("მომხმარებლები: ადმინი არ ჩანს და მისი ბარათი 404-ია; როლის შეცვლა არ შეუძლია (საკუთარისაც)", async () => {
    const { adminId, operatorId } = await withDb(async (client) => {
      const { rows } = await client.query(
        `SELECT email, id FROM "dbo"."User" WHERE email IN ('admin@gmail.com', 'operator@gmail.com')`,
      );
      const byEmail = Object.fromEntries(rows.map((row) => [row.email, row.id as number]));
      return { adminId: byEmail["admin@gmail.com"], operatorId: byEmail["operator@gmail.com"] };
    });
    const bySearch = await apiGet<{ users: { email: string }[] }>(page, "/users?q=admin%40gmail.com");
    expect(bySearch.users.map((user) => user.email)).not.toContain("admin@gmail.com");
    const byRole = await apiGet<{ users: { email: string }[] }>(page, "/users?role=ADMIN");
    expect(byRole.users, "role=ADMIN filter").toEqual([]);
    expect((await call("GET", `/users/${adminId}`)).status()).toBe(404);

    const promote = await call("PATCH", `/users/${operatorId}/role`, { role: "ADMIN" });
    if (promote.ok()) {
      // Never leave the seed operator promoted, even if the guard is broken.
      await withDb((client) =>
        client.query(
          `UPDATE "dbo"."User" SET "roleId" = (SELECT id FROM "cla"."Role" WHERE name = 'OPERATOR') WHERE id = $1`,
          [operatorId],
        ),
      );
    }
    expect(promote.status(), "self-promotion").toBe(403);

    // UI: the users screen shows a role badge, never the role select.
    await page.goto("/admin/users", { waitUntil: "networkidle" });
    await page.locator("#users-filter-search").fill("admin@gmail.com");
    await page.locator("#users-filter-search").press("Enter");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main table tbody tr").filter({ hasText: "admin@gmail.com" })).toHaveCount(0);
    await page.locator("#users-filter-search").fill("");
    await page.locator("#users-filter-search").press("Enter");
    await tableRow(page, "@").getByRole("button", { name: "სრულად ნახვა" }).click();
    const dialog = modal(page);
    await expect(dialog.locator("h3").first()).toBeVisible();
    await expect(dialog.getByRole("button", { name: "როლი", exact: true })).toHaveCount(0);
    await dialog.getByRole("button", { name: "დახურვა" }).first().click();
  });
});

test.describe("ოპერატორის სამუშაო ნაკადები", () => {
  test("შეკვეთა: სტატუსის შეცვლა „დადასტურებული“ → „გაგზავნილი“", async () => {
    const { items: statuses } = await apiGet<{ items: { key: string; nameKa: string }[] }>(page, "/order-statuses");
    await page.goto("/admin/orders");
    const search = page.getByPlaceholder("კოდი, სახელი ან ელფოსტა");
    await search.fill(names.orderCode);
    await search.press("Enter");
    await tableRow(page, names.orderCode).getByRole("button", { name: "სრულად ნახვა" }).click();
    const dialog = modal(page);
    for (const key of ["CONFIRMED", "SHIPPED"]) {
      await pickSelectByLabel(page, "შეკვეთის სტატუსი", statuses.find((status) => status.key === key)!.nameKa, dialog);
      const saved = waitForApi(page, "PATCH", new RegExp(`/api/orders/${ids.order}/status$`));
      await dialog.getByRole("button", { name: "შენახვა", exact: true }).click();
      const response = await saved;
      expect(response.status(), await response.text()).toBe(200);
      const order = entityOf(await apiGet(page, `/orders/${ids.order}`)) as unknown as { status: { key: string } };
      expect(order.status.key).toBe(key);
    }
    await dialog.getByRole("button", { name: "დახურვა" }).first().click();
  });

  test("დარეკვის თხოვნის დახურვა შიდა შენიშვნით", async () => {
    const body = await customerPost("/callback-requests", {
      vehicleListingId: catalog.ids.listing,
      name: `E2E-TEST ოპერატორის დამრეკი ${run}`,
      phone: "+995555000445",
      preferredTime: "დილით",
      note: "E2E: ოპერატორს",
    });
    ids.callback = entityOf(body).id;
    await page.goto("/admin/order-requests");
    await page.getByRole("button", { name: /დარეკვის თხოვნები/ }).click();
    const card = page.locator("main li").filter({ hasText: `E2E-TEST ოპერატორის დამრეკი ${run}` });
    await card.getByPlaceholder("მაგ. დავურეკე, ხვალ მოვა შოურუმში").fill("E2E: ოპერატორმა დაურეკა");
    const resolved = waitForApi(page, "PATCH", new RegExp(`/api/callback-requests/${ids.callback}/resolve$`));
    await card.getByRole("button").last().click();
    const response = await resolved;
    expect(response.status(), await response.text()).toBe(200);
    expect(JSON.stringify(await response.json())).toContain("RESOLVED");
  });

  test("სახელოსნო: სერვისის ტიპი → სტუმარი → ტრანსპორტი → სერვისის ჩანაწერი; რედაქტირება", async () => {
    await page.goto("/admin/service-types");
    await page.getByRole("button", { name: "+ სერვისის ტიპის დამატება" }).click();
    let dialog = modal(page);
    await dialog.locator("#service-type-name-ka").fill(names.serviceType);
    await dialog.locator("#service-type-name-en").fill(`E2E-TEST Operator service ${run}`);
    await dialog.locator("#service-type-name-ru").fill(`E2E-TEST Сервис оператора ${run}`);
    await dialog.locator("#service-type-price").fill("30");
    const typeCreated = waitForApi(page, "POST", /\/api\/service-types$/);
    await submitModal(page);
    const typeResponse = await typeCreated;
    expect(typeResponse.status(), await typeResponse.text()).toBeLessThan(300);
    ids.serviceType = entityOf(await typeResponse.json()).id;

    await page.goto("/admin/service-history");
    await page.getByRole("button", { name: "+ ახალი სტუმარი მომხმარებელი" }).click();
    dialog = modal(page);
    await dialog.locator("#walkin-first-name").fill(names.walkInFirst);
    await dialog.locator("#walkin-last-name").fill(names.walkInLast);
    const phone = `+9955${String(Date.now() + 7).slice(-8)}`;
    await pickDate(page, dialog.locator("#walkin-dob"), { year: 1988, monthsAhead: 0, day: 12 });
    await dialog.locator("#walkin-phone").fill(phone);
    const walkIn = waitForApi(page, "POST", /\/api\/users\/walk-in$/);
    await submitModal(page, "დამატება");
    const walkInResponse = await walkIn;
    expect(walkInResponse.status(), await walkInResponse.text()).toBeLessThan(300);
    ids.walkInUser = entityOf(await walkInResponse.json()).id;

    await page.getByRole("button", { name: "+ ტრანსპორტის დამატება" }).click();
    dialog = modal(page);
    const entryLabel = await pickSelect(page, "workshop-vehicle-catalog", 0, { search: catalog.names.model });
    // A year inside the picked entry's own range — label ends "(2010–2012)".
    const yearFrom = /\((\d{4})–/.exec(entryLabel)?.[1] ?? "2023";
    await dialog.locator("#workshop-vehicle-year").fill(yearFrom);
    const vehicleAdded = waitForApi(page, "POST", new RegExp(`/api/users/${ids.walkInUser}/garage$`));
    await submitModal(page, "დამატება");
    const vehicleResponse = await vehicleAdded;
    expect(vehicleResponse.status(), await vehicleResponse.text()).toBeLessThan(300);
    ids.garageVehicle = entityOf(await vehicleResponse.json()).id;

    await page.locator("main button", { hasText: catalog.names.model }).first().click();
    await page.getByRole("button", { name: "+ სერვისის დამატება" }).click();
    dialog = modal(page);
    await pickSelect(page, "service-record-type", names.serviceType);
    await dialog.locator("#service-record-mileage").fill("5000");
    await pickDate(page, dialog.locator("#service-record-date"), "today");
    await dialog.locator("#service-record-price").fill("35");
    await dialog.locator("#service-record-notes").fill("E2E ოპერატორის შენიშვნა");
    const recordCreated = waitForApi(page, "POST", /\/api\/service-records$/);
    await submitModal(page);
    const recordResponse = await recordCreated;
    expect(recordResponse.status(), await recordResponse.text()).toBeLessThan(300);
    ids.serviceRecord = entityOf(await recordResponse.json()).id;

    await page.locator("main table tbody tr:visible").first().getByRole("button", { name: "რედაქტირება" }).click();
    dialog = modal(page);
    await dialog.locator("#service-record-mileage").fill("5500");
    await dialog.locator("#service-record-notes").fill("E2E ოპერატორის შენიშვნა შეცვლილი");
    await submitModal(page);
    const { items } = await apiGet<{ items: (Record<string, unknown> & { id: number })[] }>(
      page,
      `/service-records?garageVehicleId=${ids.garageVehicle}`,
    );
    expect(items.find((item) => item.id === ids.serviceRecord)).toMatchObject({
      mileageKm: 5500,
      price: 35,
      notes: "E2E ოპერატორის შენიშვნა შეცვლილი",
    });
  });

  test("სახელოსნო: სერვისის ჩანაწერის და სერვისის ტიპის წაშლა", async () => {
    await page.goto("/admin/service-history");
    await page.locator("#service-history-user-search").fill(names.walkInLast);
    await page.locator("main button", { hasText: names.walkInLast }).first().click();
    await page.locator("main button", { hasText: catalog.names.model }).first().click();
    const row = page.locator("main table tbody tr:visible").first();
    await row.getByRole("button", { name: "წაშლა", exact: true }).click();
    const recordDeleted = waitForApi(page, "DELETE", new RegExp(`/api/service-records/${ids.serviceRecord}$`));
    await modal(page).getByRole("button", { name: "წაშლა", exact: true }).click();
    expect((await recordDeleted).status()).toBeLessThan(300);

    await page.goto("/admin/service-types");
    await page.locator("div[draggable]", { hasText: names.serviceType }).getByRole("button", { name: "წაშლა", exact: true }).click();
    const typeDeleted = waitForApi(page, "DELETE", new RegExp(`/api/service-types/${ids.serviceType}$`));
    await modal(page).getByRole("button", { name: "წაშლა", exact: true }).click();
    expect((await typeDeleted).status()).toBeLessThan(300);
    const { items } = await apiGet<{ items: { id: number }[] }>(page, "/service-types");
    expect(items.some((item) => item.id === ids.serviceType)).toBe(false);
  });

  test("FINA გვერდი იხსნება (გაშვების გარეშე — გარე სერვისს არ ვეხებით)", async () => {
    await page.goto("/admin/fina-sync", { waitUntil: "networkidle" });
    expect(new URL(page.url(), BASE_URL).pathname).toBe("/admin/fina-sync");
    await expect(page.getByText("შეფერხება მოხდა")).toHaveCount(0);
  });
});
