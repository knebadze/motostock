import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { modal, pickDate, pickSelect } from "../helpers/admin";
import { BACKEND_URL } from "../../env.js";
import { checkFinding, e2eRun, saveState } from "../helpers/admin-state";
import {
  LOCALE_URL,
  dismissCookieNotice,
  loginViaUi,
  logoutViaHeader,
  markEmailVerified,
  newCustomer,
  registerViaUi,
  saveCustomerSession,
  toastWith,
} from "../helpers/customer";

// Customer account: registration (validation + success), email
// verification state, login/logout, profile, delivery addresses, password
// change, newsletter card, personal-data export. The account created here is
// reused by the later customer groups (garage, shopping, orders) and
// deleted by the last one.

test.describe.configure({ mode: "serial", timeout: 120_000 });

const run = e2eRun();
const customer = newCustomer(run);
let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
});

test.afterAll(async () => {
  saveState("customer", { run, customer });
  await saveCustomerSession(page);
  await page.close();
});

test("რეგისტრაცია: კლიენტის ვალიდაცია (ცარიელი ველები, არასწორი ელფოსტა/ტელეფონი, პაროლები, წესები)", async () => {
  await page.goto(`${LOCALE_URL}/register`, { waitUntil: "networkidle" });
  await dismissCookieNotice(page);
  const submit = page.locator('main form button[type="submit"]');
  await submit.click();
  await expect(page.getByText("სახელი უნდა შეიცავდეს 2-50 სიმბოლოს").first()).toBeVisible();
  await expect(page.getByText("შეავსეთ ელფოსტა").first()).toBeVisible();

  await page.fill("#first-name", customer.firstName);
  await page.fill("#last-name", customer.lastName);
  await page.fill("#email", "not-an-email");
  await page.fill("#phone", "123");
  await page.fill("#password", "short");
  await page.fill("#confirm-password", "different1");
  await submit.click();
  await expect(page.getByText("არასწორი ელფოსტის ფორმატი").first()).toBeVisible();
  await expect(page.getByText("ტელეფონის ნომერი არასწორია").first()).toBeVisible();
  await expect(page.getByText("პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს").first()).toBeVisible();
  await expect(page.getByText("გასაგრძელებლად საჭიროა წესებსა და პირობებზე დათანხმება").first()).toBeVisible();
  await expect(page).toHaveURL(/\/register/);
});

test("რეგისტრაცია: წარმატებული → ანგარიში, სახელი ჰედერში, ელფოსტის დადასტურების ბანერი", async () => {
  await registerViaUi(page, customer);
  await expect(page.locator("header")).toContainText(customer.firstName);
  await expect(page.getByText(/არ მიგიღიათ წერილი|დაადასტურეთ/).first()).toBeVisible();
});

test("იგივე ელფოსტით მეორე რეგისტრაცია უარყოფილია", async ({ browser }) => {
  const other = await browser.newPage();
  await other.goto(`${LOCALE_URL}/register`, { waitUntil: "networkidle" });
  await dismissCookieNotice(other);
  await other.fill("#first-name", "E2E-TEST");
  await other.fill("#last-name", `Dup ${run}`);
  await other.fill("#email", customer.email);
  await other.fill("#phone", `+9955${String(Date.now() + 7).slice(-8)}`);
  await pickDate(other, other.locator("#date-of-birth"), { year: 1990, monthsAhead: 0, day: 3 });
  await other.fill("#password", customer.password);
  await other.fill("#confirm-password", customer.password);
  await other.locator('main form input[type="checkbox"]').check();
  await other.locator('main form button[type="submit"]').click();
  await expect(other.locator("[data-sonner-toast][data-type='error']").first()).toBeVisible();
  await expect(other).toHaveURL(/\/register/);
  await other.close();
});

test("გასვლა; არასწორი პაროლით შესვლა უარყოფილია; სწორით შესვლა", async () => {
  await logoutViaHeader(page);
  await page.goto(`${LOCALE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", customer.email);
  await page.fill("#password", "wrongpassword1");
  await page.locator('main form button[type="submit"]').click();
  await expect(page.locator("[data-sonner-toast][data-type='error']").first()).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
  await loginViaUi(page, customer.email, customer.password);
  await expect(page.locator("header")).toContainText(customer.firstName);
  await markEmailVerified(customer.email);
});

type Me = { firstName: string; lastName: string; phone: string | null; dateOfBirth: string | null; email: string };

async function getMe(): Promise<Me> {
  const response = await page.request.get(`${BACKEND_URL}/api/users/me/profile`);
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as Record<string, Me>;
  return (body.profile ?? Object.values(body)[0]) as Me;
}

test("ელფოსტის დადასტურების შემდეგ ბანერი ქრება", async () => {
  await page.goto(`${LOCALE_URL}/account`, { waitUntil: "networkidle" });
  await expect(page.getByText("არ მიგიღიათ წერილი?")).toHaveCount(0);
});

test("პროფილი: სახელი, გვარი, ტელეფონი, დაბადების თარიღი; ელფოსტა არ რედაქტირდება", async () => {
  await page.goto(`${LOCALE_URL}/account/profile`, { waitUntil: "networkidle" });
  await expect(page.locator("#profile-email")).toHaveValue(customer.email);
  checkFinding(
    !(await page.locator("#profile-email").isEditable()),
    "პროფილი: ელფოსტის ველი რედაქტირებადია, თუმცა ტექსტი წერს „ელფოსტის შესაცვლელად დაგვიკავშირდით“",
    "#profile-email is editable",
  );
  customer.lastName = `Customer Edited ${run}`;
  await page.fill("#profile-first-name", "E2E-TEST");
  await page.fill("#profile-last-name", customer.lastName);
  customer.phone = `+9955${String(Date.now() + 11).slice(-8)}`;
  await page.fill("#profile-phone", customer.phone);
  await pickDate(page, page.locator("#profile-dob"), { year: 1993, monthsAhead: 0, day: 14 });
  await page.locator("main").getByRole("button", { name: "შენახვა", exact: true }).first().click();
  await expect(toastWith(page, "მონაცემები განახლდა")).toBeVisible();
  const me = await getMe();
  expect(me).toMatchObject({ lastName: customer.lastName, phone: customer.phone });
  expect(String(me.dateOfBirth)).toContain("1993");
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator("#profile-last-name")).toHaveValue(customer.lastName);
});

test("პროფილი: მოკლე სახელი არ ინახება", async () => {
  await page.fill("#profile-first-name", "E");
  await page.locator("main").getByRole("button", { name: "შენახვა", exact: true }).first().click();
  await expect(page.getByText("სახელი და გვარი მინიმუმ 2 სიმბოლო უნდა იყოს").first()).toBeVisible();
  expect((await getMe()).firstName).toBe("E2E-TEST");
  await page.reload({ waitUntil: "networkidle" });
});

test("მისამართი: ვალიდაცია, დამატება, რედაქტირება, მეორე მისამართი, წაშლა", async () => {
  type Address = { id: number; phone: string; street: string; building: string | null; apartment: string | null; postalCode: string | null };
  const list = async () =>
    ((await (await page.request.get(`${BACKEND_URL}/api/users/me/addresses`)).json()) as { addresses: Address[] }).addresses;

  await page.goto(`${LOCALE_URL}/account/address`, { waitUntil: "networkidle" });
  await expect(page.getByText("მისამართი ჯერ არ დაგიმატებიათ.")).toBeVisible();
  await page.getByRole("button", { name: "+ მისამართის დამატება" }).click();
  let dialog = modal(page);
  await dialog.locator("#address-phone").fill("");
  await dialog.getByRole("button", { name: "შენახვა", exact: true }).click();
  await expect(dialog.getByText("აირჩიეთ ქალაქი").first()).toBeVisible();
  await expect(dialog.getByText("შეავსეთ ქუჩის დასახელება")).toBeVisible();

  await dialog.locator("#address-phone").fill(customer.phone);
  await pickSelect(page, "address-city", "თბილისი");
  await dialog.locator("#address-street").fill("E2E ქუჩა");
  await dialog.locator("#address-building").fill("12");
  await dialog.locator("#address-apartment").fill("5");
  await dialog.locator("#address-postal-code").fill("0100");
  await dialog.getByRole("button", { name: "შენახვა", exact: true }).click();
  await expect(toastWith(page, "მისამართი შენახულია")).toBeVisible();
  let addresses = await list();
  expect(addresses).toHaveLength(1);
  expect(addresses[0]).toMatchObject({ street: "E2E ქუჩა", building: "12", apartment: "5", postalCode: "0100" });

  await page.locator("main").getByRole("button", { name: "რედაქტირება" }).first().click();
  dialog = modal(page);
  await expect(dialog.locator("#address-street")).toHaveValue("E2E ქუჩა");
  await dialog.locator("#address-street").fill("E2E ქუჩა შეცვლილი");
  await dialog.locator("#address-apartment").fill("");
  await dialog.getByRole("button", { name: "შენახვა", exact: true }).click();
  await expect(toastWith(page, "მისამართი შენახულია").last()).toBeVisible();
  await expect.poll(async () => (await list())[0].street).toBe("E2E ქუჩა შეცვლილი");
  addresses = await list();
  expect(addresses[0].apartment ?? null).toBeNull();

  // A second address, then delete it (confirm dialog) — the first stays for checkout.
  const addButton = page.getByRole("button", { name: "+ მისამართის დამატება" });
  if (await addButton.isVisible()) {
    await addButton.click();
    dialog = modal(page);
    await dialog.locator("#address-phone").fill(customer.phone);
    await pickSelect(page, "address-city", 0);
    await dialog.locator("#address-street").fill("E2E მეორე ქუჩა");
    await dialog.getByRole("button", { name: "შენახვა", exact: true }).click();
    await expect.poll(async () => (await list()).length).toBe(2);
    await page
      .locator("main div")
      .filter({ hasText: "E2E მეორე ქუჩა" })
      .filter({ has: page.getByRole("button", { name: "წაშლა" }) })
      .last()
      .getByRole("button", { name: "წაშლა" })
      .click();
    await modal(page).getByRole("button", { name: "წაშლა", exact: true }).click();
    await expect(toastWith(page, "მისამართი წაიშალა")).toBeVisible();
    await expect.poll(async () => (await list()).map((address) => address.street)).toEqual(["E2E ქუჩა შეცვლილი"]);
  } else {
    test.info().annotations.push({ type: "note", description: "only one address per account is supported" });
  }
});

test("პაროლის შეცვლა: შეუსაბამობა, არასწორი მიმდინარე, წარმატება → ახალი პაროლით შესვლა", async () => {
  await page.goto(`${LOCALE_URL}/account/change-password`, { waitUntil: "networkidle" });
  const submit = page.locator("main").getByRole("button", { name: "პაროლის შეცვლა" });
  await page.fill("#current-password", customer.password);
  await page.fill("#new-password", "newsecret456");
  await page.fill("#confirm-password", "newsecret999");
  await submit.click();
  await expect(page.getByText("პაროლები არ ემთხვევა ერთმანეთს").first()).toBeVisible();

  await page.fill("#current-password", "wrongcurrent1");
  await page.fill("#confirm-password", "newsecret456");
  await submit.click();
  await expect(page.locator("[data-sonner-toast][data-type='error']").first()).toBeVisible();

  await page.fill("#current-password", customer.password);
  await submit.click();
  await expect(toastWith(page, "პაროლი წარმატებით შეიცვალა")).toBeVisible();
  customer.password = "newsecret456";

  await logoutViaHeader(page);
  await loginViaUi(page, customer.email, customer.password);
});

test("სიახლეების გამოწერა ანგარიშიდან", async () => {
  await page.goto(`${LOCALE_URL}/account/newsletter`, { waitUntil: "networkidle" });
  const toggle = page.locator("main").getByRole("switch").first();
  await expect(toggle).toBeVisible();
  const before = await toggle.getAttribute("aria-checked");
  await toggle.click();
  const ok = toastWith(page, /დასადასტურებელი წერილი გამოგზავნილია|გამოწერა გაუქმებულია/);
  const failed = page.locator("[data-sonner-toast][data-type='error']").first();
  await expect(ok.or(failed)).toBeVisible();
  const failedText = (await failed.isVisible()) ? await failed.innerText() : "";
  if (failedText) {
    // Local machine has no SMTP — the double opt-in mail can't go out, and
    // the page says so instead of pretending; not an app bug.
    expect(failedText).toContain("ელფოსტის გაგზავნა დროებით მიუწვდომელია");
    test.info().annotations.push({ type: "note", description: `newsletter (from ${before}): ${failedText}` });
    console.log(`NOTE: newsletter subscribe needs SMTP — "${failedText}"`);
    return;
  }
  await expect(page.getByText("დასადასტურებელია — შეამოწმეთ ელფოსტა და დააჭირეთ ბმულს.")).toBeVisible();
});

test("პირადი მონაცემების ჩამოტვირთვა (JSON შეიცავს პროფილსა და მისამართს)", async () => {
  await page.goto(`${LOCALE_URL}/account/profile`, { waitUntil: "networkidle" });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "მონაცემების ჩამოტვირთვა" }).click();
  const download = await downloadPromise;
  const text = readFileSync(await download.path(), "utf-8");
  expect(text).toContain(customer.email);
  expect(text).toContain("E2E ქუჩა შეცვლილი");
  expect(download.suggestedFilename()).toMatch(/\.json$/);
});
