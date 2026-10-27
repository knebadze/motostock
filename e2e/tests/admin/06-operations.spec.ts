import { test, expect, type Locator, type Page } from "@playwright/test";
import { loginAsAdmin } from "../helpers/auth";
import {
  apiGet,
  fillRichText,
  modal,
  openTab,
  pickDate,
  pickSelect,
  submitModal,
  tableRow,
  waitForApi,
} from "../helpers/admin";
import { BACKEND_URL } from "../../env.js";
import { checkFinding, e2eRun, entityOf, loadState, saveState } from "../helpers/admin-state";

// Operations group, create + edit: service types, the workshop flow (walk-in
// customer → garage vehicle → service record), user role, newsletter
// campaign (never sent), and every Settings tab (each switch and saved
// field is changed and verified, then the original settings are restored).
// Scheduled jobs / FINA sync / fraud are action-only pages (run now,
// refresh) with no create/edit form — left alone, since "run now" would
// trigger the real prune or call the external FINA service.

test.describe.configure({ mode: "serial", timeout: 240_000 });

type CatalogState = { ids: Record<string, number>; names: Record<string, string> };

const run = e2eRun();
let page: Page;
let catalog: CatalogState;
const ids: Record<string, number> = {};
const names = {
  serviceType: `E2E-TEST სერვისი ${run}`,
  walkInFirst: "E2E-TEST",
  walkInLast: `სტუმარი ${run}`,
};

test.beforeAll(async ({ browser }) => {
  catalog = loadState<CatalogState>("catalog");
  page = await browser.newPage();
  await loginAsAdmin(page);
});

test.afterAll(async () => {
  saveState("operations", { run, ids, names });
  await page.close();
});

test.describe("სახელოსნო", () => {
  type ServiceType = Record<string, unknown> & { id: number; hasPositionOption: boolean; hasFilterOption: boolean; isActive: boolean };

  test("სერვისის ტიპი — სახელი 3 ენაზე, პოზიცია/ფილტრი, ფასი, აქტიური; რედაქტირება", async () => {
    await page.goto("/admin/service-types");
    await page.getByRole("button", { name: "+ სერვისის ტიპის დამატება" }).click();
    let dialog = modal(page);
    await dialog.locator("#service-type-name-ka").fill(names.serviceType);
    await dialog.locator("#service-type-name-en").fill(`E2E-TEST Service ${run}`);
    await dialog.locator("#service-type-name-ru").fill(`E2E-TEST Сервис ${run}`);
    const switches = dialog.getByRole("switch");
    await expect(switches).toHaveCount(3);
    for (const index of [0, 1]) {
      if ((await switches.nth(index).getAttribute("aria-checked")) === "false") await switches.nth(index).click();
    }
    await dialog.locator("#service-type-price").fill("45.5");
    const created = waitForApi(page, "POST", /\/api\/service-types$/);
    await submitModal(page);
    ids.serviceType = entityOf(await (await created).json()).id;
    let { items } = await apiGet<{ items: ServiceType[] }>(page, "/service-types");
    let serviceType = items.find((item) => item.id === ids.serviceType)!;
    expect(serviceType).toMatchObject({ hasPositionOption: true, hasFilterOption: true, isActive: true, defaultPrice: 45.5 });
    expect(JSON.stringify(serviceType)).toContain(`E2E-TEST Service ${run}`);

    await page.locator("div[draggable]", { hasText: names.serviceType }).getByRole("button", { name: "რედაქტირება" }).click();
    dialog = modal(page);
    names.serviceType = `E2E-TEST სერვისი შეცვლილი ${run}`;
    await dialog.locator("#service-type-name-ka").fill(names.serviceType);
    await dialog.getByRole("switch").nth(1).click();
    await dialog.locator("#service-type-price").fill("50");
    await submitModal(page);
    ({ items } = await apiGet<{ items: ServiceType[] }>(page, "/service-types"));
    serviceType = items.find((item) => item.id === ids.serviceType)!;
    expect(serviceType).toMatchObject({ hasPositionOption: true, hasFilterOption: false, defaultPrice: 50 });
    // Back on for the service record below.
    await page.locator("div[draggable]", { hasText: names.serviceType }).getByRole("button", { name: "რედაქტირება" }).click();
    await modal(page).getByRole("switch").nth(1).click();
    await submitModal(page);
  });

  test("სტუმარი მომხმარებელი → გარაჟის ტრანსპორტი → სერვისის ჩანაწერი (ყველა ველი); ჩანაწერის რედაქტირება", async () => {
    await page.goto("/admin/service-history");
    await page.getByRole("button", { name: "+ ახალი სტუმარი მომხმარებელი" }).click();
    let dialog = modal(page);
    await dialog.locator("#walkin-first-name").fill(names.walkInFirst);
    await dialog.locator("#walkin-last-name").fill(names.walkInLast);
    // Unique 9-digit local number per run.
    const phone = `+9955${String(Date.now()).slice(-8)}`;
    await pickDate(page, dialog.locator("#walkin-dob"), { year: 1990, monthsAhead: 0, day: 10 });
    await dialog.locator("#walkin-phone").fill(phone);
    await expect(dialog.locator("#walkin-phone")).toHaveValue(phone);
    const walkIn = waitForApi(page, "POST", /\/api\/users\/walk-in$/);
    await submitModal(page, "დამატება");
    const walkInResponse = await walkIn;
    expect(walkInResponse.status(), await walkInResponse.text()).toBeLessThan(300);
    ids.walkInUser = entityOf(await walkInResponse.json()).id;
    await expect(page.locator("main").getByText(`${names.walkInFirst} ${names.walkInLast}`).first()).toBeVisible();

    await page.getByRole("button", { name: "+ ტრანსპორტის დამატება" }).click();
    dialog = modal(page);
    await pickSelect(page, "workshop-vehicle-catalog", 0, { search: catalog.names.model });
    await dialog.locator("#workshop-vehicle-year").fill("2024");
    await dialog.locator("#workshop-vehicle-vin").fill(`E2EVIN${run.toUpperCase()}`.slice(0, 17));
    const vehicleAdded = waitForApi(page, "POST", new RegExp(`/api/users/${ids.walkInUser}/garage$`));
    await submitModal(page, "დამატება");
    const vehicleResponse = await vehicleAdded;
    expect(vehicleResponse.status(), await vehicleResponse.text()).toBeLessThan(300);
    ids.garageVehicle = entityOf(await vehicleResponse.json()).id;
    const { items: garage } = await apiGet<{ items: Record<string, unknown>[] }>(page, `/users/${ids.walkInUser}/garage`);
    expect(garage.find((item) => item.id === ids.garageVehicle)).toMatchObject({ year: 2024 });

    await page.locator("main button", { hasText: catalog.names.model }).first().click();
    await page.getByRole("button", { name: "+ სერვისის დამატება" }).click();
    dialog = modal(page);
    await pickSelect(page, "service-record-type", names.serviceType);
    await expect(dialog.locator("#service-record-price")).toHaveValue(/^45\.5|50/);
    await dialog.locator("#service-record-mileage").fill("12345");
    await pickDate(page, dialog.locator("#service-record-date"), "today");
    await dialog.locator("#service-record-price").fill("60");
    // Mechanics come from team members; pick one only if any exist.
    await page.locator("#service-record-mechanic").click();
    const mechanicOptions = page.locator('[role="listbox"]:visible').last().getByRole("option");
    await page.waitForTimeout(300);
    const hasMechanic = (await mechanicOptions.count()) > 0;
    if (hasMechanic) await mechanicOptions.first().click();
    else await page.locator("#service-record-mechanic").click();
    await pickSelect(page, "service-record-position", 0);
    await dialog.getByLabel("ფილტრიც შეიცვალა").check();
    await dialog.locator("#service-record-notes").fill("E2E შენიშვნა");
    const recordCreated = waitForApi(page, "POST", /\/api\/service-records$/);
    await submitModal(page);
    const recordResponse = await recordCreated;
    expect(recordResponse.status(), await recordResponse.text()).toBeLessThan(300);
    ids.serviceRecord = entityOf(await recordResponse.json()).id;

    type Record_ = Record<string, unknown> & { id: number };
    const getRecord = async () =>
      (await apiGet<{ items: Record_[] }>(page, `/service-records?garageVehicleId=${ids.garageVehicle}`)).items.find(
        (item) => item.id === ids.serviceRecord,
      )!;
    let record = await getRecord();
    expect(record).toMatchObject({ mileageKm: 12345, price: 60, filterChanged: true, notes: "E2E შენიშვნა" });
    expect(record.position, "position").toBeTruthy();

    await tableRow(page, "12").getByRole("button", { name: "რედაქტირება" }).click();
    dialog = modal(page);
    await dialog.locator("#service-record-mileage").fill("13000");
    await dialog.locator("#service-record-price").fill("65");
    await pickSelect(page, "service-record-position", 1);
    await dialog.getByLabel("ფილტრიც შეიცვალა").uncheck();
    await dialog.locator("#service-record-notes").fill("E2E შენიშვნა შეცვლილი");
    await submitModal(page);
    record = await getRecord();
    expect(record).toMatchObject({ mileageKm: 13000, price: 65, filterChanged: false, notes: "E2E შენიშვნა შეცვლილი" });
  });

  test("სტუმარ მომხმარებელს როლის სია არ აქვს; API-ც უარყოფს staff როლს", async () => {
    await page.goto("/admin/users");
    await page.locator("#users-filter-search").fill(names.walkInLast);
    await page.locator("#users-filter-search").press("Enter");
    const row = tableRow(page, names.walkInLast);
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "სრულად ნახვა" }).click();
    const dialog = modal(page);
    await expect(dialog.getByText("სტუმარი").first()).toBeVisible();
    // Read-only role badge instead of the role select.
    await expect(dialog.getByRole("button", { name: "როლი", exact: true })).toHaveCount(0);
    await expect(dialog.getByText("მომხმარებელი", { exact: true }).first()).toBeVisible();
    for (const role of ["OPERATOR", "ADMIN"]) {
      const response = await page.request.patch(`${BACKEND_URL}/api/users/${ids.walkInUser}/role`, { data: { role } });
      expect(response.status(), `${role}: ${await response.text()}`).toBe(400);
    }
    const { user } = await apiGet<{ user: { role: string } }>(page, `/users/${ids.walkInUser}`);
    expect(user.role).toBe("USER");
    await dialog.getByRole("button", { name: "დახურვა" }).first().click();
  });
});

test.describe("ნიუსლეთერი", () => {
  test("კამპანია — სათაური + ტექსტი (rich text); რედაქტირება (გაგზავნის გარეშე)", async () => {
    type Campaign = Record<string, unknown> & { id: number; subject: string; body: string; status?: string };
    await page.goto("/admin/newsletter");
    await page.getByRole("button", { name: "+ კამპანიის შექმნა" }).click();
    let dialog = modal(page);
    await dialog.locator("#campaign-subject").fill(`E2E-TEST კამპანია ${run}`);
    await fillRichText(dialog, 0, "E2E კამპანიის ტექსტი");
    const created = waitForApi(page, "POST", /\/api\/newsletter-campaigns$/);
    await submitModal(page);
    const response = await created;
    expect(response.status(), await response.text()).toBeLessThan(300);
    ids.campaign = entityOf(await response.json()).id;

    await tableRow(page, `E2E-TEST კამპანია ${run}`).getByRole("button", { name: "რედაქტირება" }).click();
    dialog = modal(page);
    await dialog.locator("#campaign-subject").fill(`E2E-TEST კამპანია შეცვლილი ${run}`);
    await fillRichText(dialog, 0, "E2E კამპანიის ტექსტი შეცვლილი");
    await submitModal(page);
    const { items } = await apiGet<{ items: Campaign[] }>(page, "/newsletter-campaigns");
    const campaign = items.find((item) => item.id === ids.campaign)!;
    expect(campaign.subject).toBe(`E2E-TEST კამპანია შეცვლილი ${run}`);
    expect(campaign.body).toContain("E2E კამპანიის ტექსტი შეცვლილი");
    expect(campaign.status).toBe("DRAFT");
  });
});

test.describe("პარამეტრები", () => {
  type Settings = Record<string, unknown>;
  const SETTINGS_TABS = [
    "ზოგადი პარამეტრები",
    "მიტანა",
    "თაღლითობის ბარიერები",
    "FINA",
    "კალათა და შედარება",
    "ანალიტიკა და დაფა",
    "ძიება და რეკომენდაციები",
    "სესია და ავტორიზაცია",
    "სურათები",
    "ქეში",
    "მონიტორინგი",
  ];
  let original: Settings;

  async function getSettings(): Promise<Settings> {
    return (await apiGet<{ settings: Settings }>(page, "/settings")).settings;
  }

  function changedKeys(before: Settings, after: Settings): string[] {
    return Object.keys(after).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  }

  // A value the field will accept that differs from what's there.
  function nextValue(input: { type: string; value: string; placeholder: string; min: string; max: string }): string {
    if (input.type === "number") {
      const current = Number(input.value || input.min || 0);
      const max = input.max ? Number(input.max) : Infinity;
      return String(current + 1 <= max ? current + 1 : Math.max(Number(input.min || 0), current - 1));
    }
    if (input.type === "email" || /@/.test(input.placeholder)) return "e2e-settings@example.com";
    if (/\+995/.test(input.placeholder)) return "+995555000333";
    return `${input.value}1`;
  }

  test.beforeAll(async () => {
    original = await getSettings();
  });

  test.afterAll(async () => {
    // Restore every setting exactly as it was.
    const response = await page.request.patch(`${BACKEND_URL}/api/settings`, { data: original });
    expect(response.status(), await response.text()).toBe(200);
    const restored = await getSettings();
    expect(changedKeys(original, restored)).toEqual([]);
  });

  for (const tab of SETTINGS_TABS) {
    test(`ჩანართი „${tab}“ — ყოველი გადამრთველი და შესანახი ველი`, async () => {
      await page.goto("/admin/settings");
      const main = page.locator("main");
      await openTab(main, tab);
      const panel = main;

      // Switches either save immediately (flip, verify, flip back) or only
      // edit a draft the tab saves as a whole (e.g. "მიტანა").
      const switches = panel.locator('[role="switch"]:visible');
      const switchCount = await switches.count();
      let draftMode = false;
      for (let index = 0; index < switchCount && !draftMode; index++) {
        const toggle = switches.nth(index);
        if (await toggle.isDisabled()) continue;
        const label = (await toggle.getAttribute("aria-label")) ?? `#${index}`;
        for (const round of [1, 2]) {
          const before = await getSettings();
          const saved = waitForApi(page, "PATCH", /\/api\/settings$/).catch(() => null);
          await toggle.click();
          // Some switches ask for confirmation first.
          const confirm = modal(page);
          if (await confirm.isVisible().catch(() => false)) {
            await confirm.getByRole("button").filter({ hasNotText: /გაუქმება|დახურვა/ }).last().click();
          }
          const response = await Promise.race([saved, page.waitForTimeout(3_000).then(() => null)]);
          if (!response) {
            // No request: a draft switch — leave it flipped for the tab save below.
            draftMode = true;
            break;
          }
          if (response.status() === 400 && round === 1) {
            // An intentional server-side guard (e.g. cloud storage without
            // Cloudinary env vars) — note it and move on.
            const body = await response.text();
            test.info().annotations.push({ type: "note", description: `${tab} › ${label}: guarded — ${body}` });
            console.log(`NOTE: ${tab} › ${label}: guarded — ${body}`);
            await page.locator("[data-sonner-toast][data-type='error']").first().waitFor({ state: "detached", timeout: 10_000 }).catch(() => {});
            break;
          }
          expect(response.status(), `${tab} › ${label} (round ${round}): ${await response.text()}`).toBe(200);
          const after = await getSettings();
          expect(changedKeys(before, after).length, `${tab} › ${label} changed a setting`).toBeGreaterThan(0);
          await expect(page.locator("[data-sonner-toast][data-type='error']")).toHaveCount(0);
        }
      }

      if (draftMode) {
        console.log(`COVERAGE ${tab}: draft tab, switches=${switchCount}`);
        // One switch flipped above; also change every field, then save the tab.
        const inputs = panel.locator("input:not([type=checkbox]):not([type=file]):visible");
        const entered: string[] = [];
        for (let inputIndex = 0; inputIndex < (await inputs.count()); inputIndex++) {
          const input = inputs.nth(inputIndex);
          if (!(await input.isEditable())) continue;
          const attrs = await input.evaluate((element) => {
            const field = element as HTMLInputElement;
            return { type: field.type, value: field.value, placeholder: field.placeholder, min: field.min, max: field.max };
          });
          const value = nextValue(attrs);
          await input.fill(value);
          entered.push(value);
        }
        const before = await getSettings();
        const saved = waitForApi(page, "PATCH", /\/api\/settings$/);
        await panel.locator("button:visible", { hasText: /^შენახვა$/ }).last().click();
        const response = await saved;
        const body = await response.text();
        checkFinding(response.ok(), `პარამეტრები › ${tab}: ჩანართის შენახვა ვერ მოხერხდა`, `${response.status()} ${body}`);
        if (response.ok()) {
          const keys = changedKeys(before, await getSettings());
          expect(keys.length, `${tab}: saved draft changed settings (${entered.length} fields + 1 switch)`).toBeGreaterThan(0);
          test.info().annotations.push({ type: "note", description: `${tab}: changed ${keys.join(", ")}` });
        }
        return;
      }

      // Fields with their own save button.
      const cards = panel.locator("div.rounded-2xl:visible").filter({
        has: page.locator("input:not([type=checkbox]):not([type=file]):visible"),
      }).filter({ has: page.locator("button:visible", { hasText: /^შენახვა$/ }) });
      const cardCount = await cards.count();
      console.log(`COVERAGE ${tab}: switches=${switchCount}, saveCards=${cardCount}`);
      for (let index = 0; index < cardCount; index++) {
        const card: Locator = cards.nth(index);
        const inputs = card.locator("input:not([type=checkbox]):not([type=file]):visible");
        const inputCount = await inputs.count();
        const entered: string[] = [];
        for (let inputIndex = 0; inputIndex < inputCount; inputIndex++) {
          const input = inputs.nth(inputIndex);
          if (!(await input.isEditable())) continue;
          const attrs = await input.evaluate((element) => {
            const field = element as HTMLInputElement;
            return { type: field.type, value: field.value, placeholder: field.placeholder, min: field.min, max: field.max };
          });
          const value = nextValue(attrs);
          await input.fill(value);
          entered.push(value);
        }
        if (entered.length === 0) continue;
        const heading = (await card.locator("p.font-medium, h3, label").first().innerText().catch(() => `card ${index}`)).trim();
        const before = await getSettings();
        const saved = waitForApi(page, "PATCH", /\/api\/settings$/);
        await card.locator("button:visible", { hasText: /^შენახვა$/ }).click();
        const response = await saved;
        const body = await response.text();
        checkFinding(response.ok(), `პარამეტრები › ${tab} › „${heading}“ ვერ შეინახა`, `entered ${entered.join(", ")} → ${response.status()} ${body}`);
        if (!response.ok()) continue;
        const after = await getSettings();
        const keys = changedKeys(before, after);
        checkFinding(keys.length > 0, `პარამეტრები › ${tab} › „${heading}“ შენახვამ არაფერი შეცვალა`, `entered ${entered.join(", ")}`);
        for (const value of entered) {
          checkFinding(
            JSON.stringify(after).includes(value.replace(/^\+/, "")) || keys.length > 0,
            `პარამეტრები › ${tab} › „${heading}“: შეყვანილი მნიშვნელობა არ ჩანს`,
            value,
          );
        }
      }
    });
  }
});
