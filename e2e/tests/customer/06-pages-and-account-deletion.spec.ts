import { test, expect, type Page } from "@playwright/test";
import { modal } from "../helpers/admin";
import { checkFinding, loadState } from "../helpers/admin-state";
import { BACKEND_URL } from "../../env.js";
import { LOCALE_URL, customerPage, dismissCookieNotice, toastWith, type Customer } from "../helpers/customer";

// Everything else a visitor/customer can do, then — last — deleting the
// account: info pages, language + theme switch, password recovery, footer
// newsletter, the chat widget (opened, never sent — it relays to WhatsApp),
// and account deletion (refused while an order is in progress, then works
// and the account can't log in any more).

test.describe.configure({ mode: "serial", timeout: 120_000 });

type CustomerState = { run: string; customer: Customer };
type OrdersState = { ids: Record<string, number> };

let page: Page;
let state: CustomerState;

test.beforeAll(async ({ browser }) => {
  state = loadState<CustomerState>("customer");
  page = await customerPage(browser, state.customer.email, state.customer.password);
});

test.afterAll(async () => {
  await page.close();
});

test.describe("ინფორმაციული გვერდები", () => {
  for (const [path, heading] of [
    ["/about", /ჩვენ შესახებ/],
    ["/contact", /კონტაქტი/],
    ["/faq", /ხშირად დასმული კითხვები/],
    ["/vacancies", /ვაკანსიები/],
    ["/service", /სერვის/],
    ["/catalog", /კატალოგი/],
    ["/terms", /წესები და პირობები/],
    ["/privacy", /კონფიდენციალობის პოლიტიკა/],
    ["/shipping", /მიწოდება და დაბრუნება/],
  ] as const) {
    test(`${path} იხსნება სათაურით, შეცდომის გარეშე`, async () => {
      const response = await page.goto(`${LOCALE_URL}${path}`, { waitUntil: "networkidle" });
      expect(response?.status(), path).toBe(200);
      await expect(page.locator("h1").first()).toContainText(heading);
      await expect(page.getByText("შეფერხება მოხდა")).toHaveCount(0);
    });
  }

  test("კონტაქტი: მისამართი, ტელეფონი (tel:), სამუშაო საათები", async () => {
    await page.goto(`${LOCALE_URL}/contact`, { waitUntil: "networkidle" });
    const main = page.locator("main");
    await expect(main.getByText("სამუშაო საათები").first()).toBeVisible();
    await expect(main.locator('a[href^="tel:"]').first()).toBeVisible();
  });

  test("FAQ: კითხვაზე დაჭერა პასუხს აჩენს", async () => {
    await page.goto(`${LOCALE_URL}/faq`, { waitUntil: "networkidle" });
    const question = page.locator("main summary, main button[aria-expanded]").first();
    if (!(await question.isVisible().catch(() => false))) {
      test.info().annotations.push({ type: "note", description: "no active FAQ entries" });
      return;
    }
    await question.click();
    await expect(page.locator("main details[open], main [aria-expanded='true']").first()).toBeVisible();
  });

  test("ვაკანსია: სიიდან დეტალურ გვერდზე და უკან", async () => {
    await page.goto(`${LOCALE_URL}/vacancies`, { waitUntil: "networkidle" });
    const details = page.getByRole("link", { name: "დეტალურად ნახვა" }).first();
    if (!(await details.isVisible().catch(() => false))) {
      await expect(page.getByText("ამჟამად ღია ვაკანსია არ არის.")).toBeVisible();
      return;
    }
    await details.click();
    await page.waitForURL(/\/vacancies\/.+/);
    await page.getByRole("link", { name: "ყველა ვაკანსია" }).click();
    await page.waitForURL(/\/vacancies$/);
  });
});

test.describe("ენა და თემა", () => {
  test("ენის გადართვა ka → en → ru: URL და შიგთავსი იცვლება", async () => {
    await page.goto(`${LOCALE_URL}/faq`, { waitUntil: "networkidle" });
    for (const [code, heading] of [
      ["en", /Frequently asked questions|FAQ/i],
      ["ru", /Часто задаваемые вопросы|FAQ/i],
      ["ka", /ხშირად დასმული კითხვები/],
    ] as const) {
      await page.getByRole("button", { name: /^(ენა|Language|Язык)$/ }).first().click();
      const label = code === "en" ? "English" : code === "ru" ? "Русский" : "ქართული";
      await page.locator('[role="listbox"]:visible').last().getByRole("option", { name: new RegExp(label) }).click();
      await page.waitForURL(new RegExp(`/${code}/faq`));
      await expect(page.locator("h1").first()).toContainText(heading);
    }
  });

  test("თემის გადართვა (მუქი/ღია) და შენახვა გადატვირთვის შემდეგ", async () => {
    await page.goto(LOCALE_URL, { waitUntil: "networkidle" });
    const html = page.locator("html");
    const toDark = page.getByRole("button", { name: "ჩართე მუქი რეჟიმი" }).first();
    if (await toDark.isVisible().catch(() => false)) {
      await toDark.click();
      await expect(html).toHaveClass(/dark/);
      await page.reload({ waitUntil: "networkidle" });
      await expect(html).toHaveClass(/dark/);
      await page.getByRole("button", { name: "ჩართე ღია რეჟიმი" }).first().click();
      await expect(html).not.toHaveClass(/dark/);
    }
  });
});

test.describe("სტუმრის ფუნქციები", () => {
  test("პაროლის აღდგენა: ფორმა და ნეიტრალური პასუხი (ელფოსტის არსებობას არ ამხელს)", async ({ browser }) => {
    const context = await browser.newContext();
    const guest = await context.newPage();
    await guest.goto(`${LOCALE_URL}/login`, { waitUntil: "networkidle" });
    await dismissCookieNotice(guest);
    await guest.getByRole("link", { name: "დაგავიწყდათ პაროლი?" }).click();
    await guest.waitForURL(/forgot-password/);
    for (const email of [state.customer.email, `nobody-${state.run}@example.com`]) {
      await guest.fill("#email", email);
      await guest.locator("main form button[type='submit']").click();
      const sent = guest.getByText(/თუ ეს ელფოსტა დარეგისტრირებულია/).first();
      const failed = guest.locator("[data-sonner-toast][data-type='error']").first();
      await expect(sent.or(failed)).toBeVisible();
      if (await failed.isVisible()) {
        test.info().annotations.push({ type: "note", description: `forgot-password (${email}): ${await failed.innerText()} — no SMTP locally` });
      }
      await guest.goto(`${LOCALE_URL}/forgot-password`, { waitUntil: "networkidle" });
    }
    await context.close();
  });

  test("პაროლის შეცვლა არასწორი ბმულით უარყოფილია", async ({ browser }) => {
    const context = await browser.newContext();
    const guest = await context.newPage();
    await guest.goto(`${LOCALE_URL}/reset-password?token=not-a-real-token`, { waitUntil: "networkidle" });
    await dismissCookieNotice(guest);
    const passwordInputs = guest.locator("main input[type='password']");
    if ((await passwordInputs.count()) > 0) {
      await passwordInputs.nth(0).fill("brandnew123");
      if ((await passwordInputs.count()) > 1) await passwordInputs.nth(1).fill("brandnew123");
      await guest.locator("main form button[type='submit']").click();
    }
    await expect(guest.getByText(/აღდგენის ბმული არასწორია ან ვადაგასულია|ბმული არასწორია/).first()).toBeVisible();
    await context.close();
  });

  test("ფუტერის სიახლეების გამოწერა (სტუმარი)", async ({ browser }) => {
    const context = await browser.newContext();
    const guest = await context.newPage();
    await guest.goto(LOCALE_URL, { waitUntil: "networkidle" });
    await dismissCookieNotice(guest);
    const footer = guest.locator("footer");
    await footer.locator("input[type='email']").fill(`e2e-test-news-${state.run}@example.com`);
    await footer.getByRole("button", { name: "გამოწერა" }).click();
    const ok = footer.getByRole("status");
    const failed = guest.locator("[data-sonner-toast][data-type='error']").first();
    await expect(ok.or(failed)).toBeVisible();
    if (await failed.isVisible()) {
      test.info().annotations.push({ type: "note", description: `footer newsletter: ${await failed.innerText()} — no SMTP locally` });
    }
    await context.close();
  });

  test("ჩატის ფანჯარა: იხსნება, ცარიელი ველებით გაგზავნა არ ხდება (WhatsApp-ზე არაფერი იგზავნება)", async () => {
    await page.goto(LOCALE_URL, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "ჩატის გახსნა" }).click();
    await expect(page.getByText("შეკითხვები გაქვთ?").first()).toBeVisible();
    const start = page.getByRole("button", { name: "WhatsApp ჩატის დაწყება" });
    if (await start.isVisible().catch(() => false)) {
      await start.click();
      await page.getByRole("button", { name: "გაგზავნა" }).last().click();
      await expect(page.getByText("შეავსეთ ნომერი და შეტყობინება").first()).toBeVisible();
      await page.getByRole("button", { name: "← უკან" }).click();
    }
    await page.getByRole("button", { name: "დახურვა" }).last().click();
  });
});

test.describe("ანგარიშის წაშლა (ბოლო ნაბიჯი)", () => {
  test("მიმდინარე შეკვეთისას წაშლა უარყოფილია; არასწორი პაროლი უარყოფილია", async () => {
    await page.goto(`${LOCALE_URL}/account/profile`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "ანგარიშის წაშლა" }).first().click();
    const dialog = modal(page);
    await expect(dialog).toContainText("დარწმუნებული ხართ?");
    await dialog.locator("#delete-password").fill("wrongpassword1");
    await dialog.getByRole("button", { name: "სამუდამოდ წაშლა" }).click();
    await expect(page.locator("[data-sonner-toast][data-type='error']").first()).toBeVisible();
    await page.locator("[data-sonner-toast]").first().waitFor({ state: "detached", timeout: 10_000 }).catch(() => {});

    await dialog.locator("#delete-password").fill(state.customer.password);
    const attempt = page.waitForResponse((response) => response.url().endsWith("/api/users/me") && response.request().method() === "DELETE");
    await dialog.getByRole("button", { name: "სამუდამოდ წაშლა" }).click();
    const response = await attempt;
    expect(response.status(), "refused while an order is in progress").toBe(409);
    await expect(page.locator("[data-sonner-toast][data-type='error']").first()).toBeVisible();
    // The close "X" is also labelled "გაუქმება" — use the text button.
    await dialog.getByText("გაუქმება", { exact: true }).click();
  });

  test("შეკვეთების დასრულების შემდეგ წაშლა ხერხდება; შესვლა აღარ შეიძლება", async ({ playwright }) => {
    // The shop finishes (cancels) every open order of this customer.
    const admin = await playwright.request.newContext();
    expect((await admin.post(`${BACKEND_URL}/api/auth/login`, { data: { email: "admin@gmail.com", password: "admin123" } })).ok()).toBe(true);
    const { items: statuses } = (await (await admin.get(`${BACKEND_URL}/api/order-statuses`)).json()) as { items: { id: number; key: string }[] };
    const cancelled = statuses.find((status) => status.key === "CANCELLED")!.id;
    const { items: reasons } = (await (await admin.get(`${BACKEND_URL}/api/lookups/cancellation-reasons`)).json()) as { items: { id: number }[] };
    const mine = (await (await page.request.get(`${BACKEND_URL}/api/orders/me`)).json()) as Record<string, { id: number; status: { key: string } }[]>;
    const orders = (mine.items ?? mine.orders ?? Object.values(mine).find(Array.isArray) ?? []) as { id: number; status: { key: string } }[];
    for (const order of orders.filter((item) => !["DELIVERED", "CANCELLED"].includes(item.status.key))) {
      const moved = await admin.patch(`${BACKEND_URL}/api/orders/${order.id}/status`, {
        data: { statusId: cancelled, cancellationReasonId: reasons[0]?.id, cancellationNote: "E2E: ანგარიშის წაშლამდე" },
      });
      expect(moved.status(), await moved.text()).toBe(200);
    }
    await admin.dispose();

    await page.goto(`${LOCALE_URL}/account/profile`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "ანგარიშის წაშლა" }).first().click();
    const dialog = modal(page);
    await dialog.locator("#delete-password").fill(state.customer.password);
    const deleted = page.waitForResponse((response) => response.url().endsWith("/api/users/me") && response.request().method() === "DELETE");
    await dialog.getByRole("button", { name: "სამუდამოდ წაშლა" }).click();
    const response = await deleted;
    expect(response.status(), await response.text()).toBe(200);
    const body = (await response.json()) as { anonymized: boolean };
    // Orders are kept (legally required), so the account is anonymized.
    expect(body.anonymized).toBe(true);
    await expect(toastWith(page, "ანგარიში წაიშალა")).toBeVisible();
    await expect(page.locator("header")).toContainText("შესვლა");

    // Login with the old credentials no longer works.
    const login = await page.request.post(`${BACKEND_URL}/api/auth/login`, {
      data: { email: state.customer.email, password: state.customer.password },
    });
    checkFinding(login.status() >= 400, "ანგარიშის წაშლის შემდეგ ძველი მონაცემებით შესვლა ისევ შესაძლებელია", `login → ${login.status()}`);
    void ({} as OrdersState);
  });
});
