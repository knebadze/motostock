import { test, expect, type Locator, type Page, type Response } from "@playwright/test";
import { loginAsAdmin } from "../helpers/auth";
import { apiGet, modal, openTab, pickSelectByLabel } from "../helpers/admin";
import { checkFinding, loadState } from "../helpers/admin-state";
import { BACKEND_URL } from "../../env.js";

// Deletion phase, admin side. Deletes everything the admin + customer
// chains created (from .admin-state), through the UI, in reverse dependency
// order. Every delete first checks that "გაუქმება" in the confirm dialog
// changes nothing; then deletes and verifies through the API. Rows still
// referenced by other data (Restrict FKs) are tried first while referenced:
// the delete must be refused with a readable message and the row must stay.
// Run LAST — after tests/admin and tests/customer.

test.describe.configure({ mode: "serial", timeout: 180_000 });

type State = { run: string; ids: Record<string, number>; names: Record<string, string> };

let page: Page;
let catalog: State;
let classifiers: State;
let products: State & { attributeIds: Record<string, number> };
let marketing: State;
let content: State;
let operations: State;
let linking: State;
let customerOrders: { promoCode: string; ids: Record<string, number> };

test.beforeAll(async ({ browser }) => {
  catalog = loadState("catalog");
  classifiers = loadState("classifiers");
  products = loadState("products");
  marketing = loadState("marketing");
  content = loadState("content");
  operations = loadState("operations");
  linking = loadState("linking");
  customerOrders = loadState("customer-orders");
  page = await browser.newPage();
  await loginAsAdmin(page);
});

test.afterAll(async () => {
  await page.close();
});

// The innermost visible list row / card that holds `text` and a delete button.
function itemWith(text: string): Locator {
  return page
    .locator("main tr:visible, main li:visible, main div:visible")
    .filter({ hasText: text })
    .filter({ has: page.getByRole("button", { name: "წაშლა", exact: true }) })
    .last();
}

type Outcome = "deleted" | "in-use";

// Cancel once (nothing must happen), then confirm. Returns the outcome.
async function deleteVia(item: Locator, path: RegExp, label: string): Promise<{ outcome: Outcome; response: Response }> {
  await expect(item, `${label}: row visible`).toBeVisible();
  let deletes = 0;
  const counter = (request: { method(): string; url(): string }) => {
    if (request.method() === "DELETE" && path.test(new URL(request.url()).pathname)) deletes++;
  };
  page.on("request", counter);
  await item.getByRole("button", { name: "წაშლა", exact: true }).click();
  await modal(page).getByText("გაუქმება", { exact: true }).click();
  await expect(modal(page)).toHaveCount(0);
  expect(deletes, `${label}: cancel sends nothing`).toBe(0);
  page.off("request", counter);

  const deleted = page.waitForResponse(
    (response) => response.request().method() === "DELETE" && path.test(new URL(response.url()).pathname),
  );
  await item.getByRole("button", { name: "წაშლა", exact: true }).click();
  await modal(page).getByRole("button", { name: "წაშლა", exact: true }).click();
  const response = await deleted;
  if (response.ok()) {
    await expect(modal(page)).toHaveCount(0);
    return { outcome: "deleted", response };
  }
  // Refused: a readable error and the dialog can be closed.
  const toast = page.locator("[data-sonner-toast][data-type='error']").first();
  await expect(toast, `${label}: refusal message`).toBeVisible();
  const message = await toast.innerText();
  checkFinding(!/Internal|Error:|undefined|500/.test(message), `წაშლა: ${label} — გაუგებარი შეცდომის ტექსტი`, message);
  if (await modal(page).isVisible().catch(() => false)) await modal(page).getByText("გაუქმება", { exact: true }).click();
  await page.locator("[data-sonner-toast]").first().waitFor({ state: "detached", timeout: 10_000 }).catch(() => {});
  return { outcome: "in-use", response };
}

async function expectDeleted(item: Locator, path: RegExp, label: string, gone: () => Promise<boolean>) {
  const { outcome, response } = await deleteVia(item, path, label);
  expect(outcome, `${label}: ${response.status()} ${await response.text().catch(() => "")}`).toBe("deleted");
  await expect.poll(gone, { message: `${label} gone from the API` }).toBe(true);
}

async function expectInUse(item: Locator, path: RegExp, label: string, stillThere: () => Promise<boolean>) {
  const { outcome, response } = await deleteVia(item, path, label);
  expect(outcome, `${label} should be refused while referenced (got ${response.status()})`).toBe("in-use");
  // 409 from the FK safety net, or 400 from a service's own pre-check.
  expect([400, 409]).toContain(response.status());
  expect(await stillThere(), `${label} still exists`).toBe(true);
}

async function listHas(path: string, id: number, key = "items"): Promise<boolean> {
  const body = await apiGet<Record<string, { id: number }[]>>(page, path);
  const list = body[key] ?? (Object.values(body).find(Array.isArray) as { id: number }[]);
  return list.some((item) => item.id === id);
}

test.describe("კონტენტი და სლაიდები", () => {
  test("hero სლაიდები: ჩვეულებრივი, პრომოკოდის და ივენთის", async () => {
    await page.goto("/admin/hero-slides");
    for (const [title, id] of [
      [`E2E-TEST სათაური შეცვლილი ${content.run}`, content.ids.heroSlide],
      [`E2E-TEST პრომო სლაიდი გვერდიდან ${linking.run}`, linking.ids.promoSlide],
      [`E2E-TEST ივენთის სლაიდი ${linking.run}`, linking.ids.eventSlide],
    ] as const) {
      await expectDeleted(itemWith(title), /\/api\/hero-slides\/\d+$/, `slide ${title}`, async () => !(await listHas("/hero-slides", id)));
    }
    // The promo code / event they belonged to lose the link, not the record.
    const { items } = await apiGet<{ items: { id: number; heroSlideId: number | null }[] }>(page, "/promo-codes?domain=VEHICLE");
    expect(items.find((item) => item.id === marketing.ids.vehiclePromo)?.heroSlideId ?? null).toBeNull();
  });

  test("FAQ, გუნდის წევრი, ვაკანსია, ბანკი (ბანკი ბარათით შეკვეთაზეა — შეკვეთა რჩება)", async () => {
    await page.goto("/admin/faq");
    await expectDeleted(itemWith(`E2E-TEST კითხვა შეცვლილი ${content.run}`), /\/api\/faq\/\d+$/, "faq", async () => !(await listHas("/faq", content.ids.faq)));
    await page.goto("/admin/team-members");
    await expectDeleted(itemWith(`E2E-TEST წევრი შეცვლილი ${content.run}`), /\/api\/team-members\/\d+$/, "team member", async () => !(await listHas("/team-members", content.ids.teamMember)));
    await page.goto("/admin/vacancies");
    await expectDeleted(itemWith(`E2E-TEST ვაკანსია შეცვლილი ${content.run}`), /\/api\/vacancies\/\d+$/, "vacancy", async () => !(await listHas("/vacancies", content.ids.vacancy)));
    await page.goto("/admin/banks");
    await expectDeleted(itemWith(`E2E-TEST ბანკი შეცვლილი ${content.run}`), /\/api\/banks\/\d+$/, "bank", async () => !(await listHas("/banks", content.ids.bank)));
  });

  test("ნიუსლეთერის კამპანია", async () => {
    await page.goto("/admin/newsletter");
    await expectDeleted(
      itemWith(`E2E-TEST კამპანია შეცვლილი ${operations.run}`),
      /\/api\/newsletter-campaigns\/\d+$/,
      "campaign",
      async () => !(await listHas("/newsletter-campaigns", operations.ids.campaign)),
    );
  });
});

test.describe("სახელოსნო", () => {
  test("სერვისის ტიპი ჩანაწერის არსებობისას დაცულია; ჩანაწერის წაშლის შემდეგ იშლება", async () => {
    await page.goto("/admin/service-types");
    const card = page.locator("div[draggable]", { hasText: operations.names.serviceType });
    await expectInUse(card, /\/api\/service-types\/\d+$/, "service type in use", async () => listHas("/service-types", operations.ids.serviceType));

    // Delete the service record in the workshop screen.
    await page.goto("/admin/service-history");
    await page.locator("#service-history-user-search").fill(operations.names.walkInLast);
    await page.locator("main button", { hasText: operations.names.walkInLast }).first().click();
    await page.locator("main button", { hasText: catalog.names.model }).first().click();
    await expectDeleted(
      page.locator("main table tbody tr:visible").first(),
      /\/api\/service-records\/\d+$/,
      "service record",
      async () =>
        !((await apiGet<{ items: { id: number }[] }>(page, `/service-records?garageVehicleId=${operations.ids.garageVehicle}`)).items.some(
          (item) => item.id === operations.ids.serviceRecord,
        )),
    );
    // Other test records on the same type (customer garage group) may remain.
    await page.goto("/admin/service-types");
    const retry = await deleteVia(page.locator("div[draggable]", { hasText: operations.names.serviceType }), /\/api\/service-types\/\d+$/, "service type");
    test.info().annotations.push({ type: "note", description: `service type after record delete: ${retry.outcome}` });
  });
});

test.describe("ფასდაკლებები და ფილტრები", () => {
  test("მასობრივი ფასდაკლების ივენთი (ფასდაკლებები რჩება, კავშირი იხსნება)", async () => {
    await page.goto("/admin/bulk-discounts");
    await openTab(page.locator("main"), "ივენთები");
    await expectDeleted(
      itemWith(`E2E-TEST ივენთი შეცვლილი ${marketing.run}`),
      /\/api\/bulk-discount-events\/\d+$/,
      "bulk discount event",
      async () => !(await listHas("/bulk-discount-events", marketing.ids.event)),
    );
  });

  test("პრომოკოდები (შეკვეთაში გამოყენებულიც — შეკვეთა რჩება)", async () => {
    const MRUN = marketing.run.toUpperCase();
    await page.goto("/admin/promo-codes");
    for (const code of [`E2E${MRUN}ED`, customerOrders.promoCode]) {
      const row = itemWith(code);
      if (!(await row.isVisible().catch(() => false))) continue;
      await expectDeleted(row, /\/api\/promo-codes\/\d+$/, `promo ${code}`, async () => {
        const { items } = await apiGet<{ items: { code: string }[] }>(page, "/promo-codes?domain=PRODUCT");
        return !items.some((item) => item.code === code);
      });
    }
    await openTab(page.locator("main"), "ტრანსპორტი");
    await expectDeleted(itemWith(`E2EV${MRUN}`), /\/api\/promo-codes\/\d+$/, "vehicle promo", async () => !(await listHas("/promo-codes?domain=VEHICLE", marketing.ids.vehiclePromo)));
    // The courier order that used the customer promo still opens.
    const order = await page.request.get(`${BACKEND_URL}/api/orders/${customerOrders.ids.courierOrder}`);
    expect(order.ok(), "order that used the deleted promo still readable").toBe(true);
  });

  test("შოპის ფილტრები (პროდუქტი + ტრანსპორტი)", async () => {
    await page.goto("/admin/category-filters");
    await pickSelectByLabel(page, "კატეგორია", catalog.names.rootCategoryKa);
    await expect(page.locator("main table tbody tr:visible").filter({ has: page.getByRole("button", { name: "წაშლა", exact: true }) }).first()).toBeVisible();
    for (let index = 0; index < 4; index++) {
      const row = page.locator("main table tbody tr:visible").filter({ has: page.getByRole("button", { name: "წაშლა", exact: true }) }).first();
      if (!(await row.isVisible().catch(() => false))) break;
      await deleteVia(row, /\/api\/category-filters\/\d+$/, "category filter");
    }
    expect((await apiGet<{ items: unknown[] }>(page, `/category-filters?categoryId=${catalog.ids.rootCategory}`)).items).toHaveLength(0);

    await page.goto("/admin/vehicle-category-filters");
    await pickSelectByLabel(page, "ტრანსპორტის კატეგორია", `— ${catalog.names.vehicleCategoryKa}`);
    await expect(page.locator("main table tbody tr:visible").filter({ has: page.getByRole("button", { name: "წაშლა", exact: true }) }).first()).toBeVisible();
    for (let index = 0; index < 4; index++) {
      const row = page.locator("main table tbody tr:visible").filter({ has: page.getByRole("button", { name: "წაშლა", exact: true }) }).first();
      if (!(await row.isVisible().catch(() => false))) break;
      await deleteVia(row, /\/api\/vehicle-category-filters\/\d+$/, "vehicle category filter");
    }
    expect((await apiGet<{ items: unknown[] }>(page, `/vehicle-category-filters?categoryId=${catalog.ids.vehicleCategory}`)).items).toHaveLength(0);
  });
});

test.describe("პროდუქტები", () => {
  const attributeName = (type: string) =>
    type === "TEXT" ? `E2E-TEST TEXT შეცვლილი ${products.run}` : `E2E-TEST ${type} ${products.run}`;

  test("მახასიათებელი პროდუქტზე გამოყენებისას დაცულია; SELECT-ის გამოუყენებელი მნიშვნელობა იშლება", async () => {
    await page.goto("/admin/attributes");
    await expectInUse(itemWith(attributeName("SELECT")), /\/api\/attributes\/\d+$/, "attribute in use", async () => {
      const { items } = await apiGet<{ items: { id: number }[] }>(page, `/attributes?categoryId=${catalog.ids.rootCategory}`);
      return items.some((item) => item.id === products.attributeIds.select);
    });
    // Options panel: delete the unused "E2E ორი".
    await itemWith(attributeName("SELECT")).getByRole("button", { name: "რედაქტირება" }).click();
    const dialog = modal(page);
    await openTab(dialog, "მნიშვნელობები");
    const optionRow = dialog.locator("tr:visible", { hasText: "E2E ორი" });
    const deleted = page.waitForResponse((response) => response.request().method() === "DELETE" && /\/options\/\d+$/.test(response.url()));
    await optionRow.getByRole("button", { name: "წაშლა" }).click();
    const confirm = page.locator('[role="dialog"]:visible').filter({ has: page.locator("h2") }).last();
    if (await confirm.getByRole("button", { name: "წაშლა", exact: true }).isVisible().catch(() => false)) {
      await confirm.getByRole("button", { name: "წაშლა", exact: true }).click();
    }
    expect((await deleted).status()).toBeLessThan(300);
    const { items: options } = await apiGet<{ items: { key: string }[] }>(page, `/attributes/${products.attributeIds.select}/options`);
    expect(options.map((option) => option.key)).not.toContain("E2E_TWO");
    await page.keyboard.press("Escape");
  });

  test("პროდუქტის წაშლა (ვარიანტები/სურათები/ფასდაკლებები იშლება; შეკვეთები რჩება snapshot-ით)", async () => {
    await page.goto("/admin/products");
    const panel = page.locator("main details");
    await panel.locator("summary").click();
    await panel.locator('div:has(> label:text-is("ძებნა (სახელი)")) > input').fill(products.names.productKa);
    await panel.getByRole("button", { name: "გაფილტვრა" }).click();
    await expectDeleted(itemWith(products.names.productKa), /\/api\/products\/\d+$/, "product", async () => {
      const response = await page.request.get(`${BACKEND_URL}/api/products/${products.ids.product}`);
      return response.status() === 404;
    });
    expect((await page.request.get(`${BACKEND_URL}/api/product-variants/${products.ids.variant}/discounts`)).ok()).toBe(false);
    const order = (await (await page.request.get(`${BACKEND_URL}/api/orders/${customerOrders.ids.courierOrder}`)).json()) as Record<string, unknown>;
    expect(JSON.stringify(order), "order keeps the product name snapshot").toContain("E2E-TEST");
  });

  test("მახასიათებლები, პროდუქტის ბრენდი, ტეგი", async () => {
    await page.goto("/admin/attributes");
    for (const type of ["SELECT", "TEXT", "NUMBER", "BOOLEAN"]) {
      const id = products.attributeIds[type.toLowerCase()];
      await expectDeleted(itemWith(attributeName(type)), /\/api\/attributes\/\d+$/, `attribute ${type}`, async () => {
        const { items } = await apiGet<{ items: { id: number }[] }>(page, `/attributes?categoryId=${catalog.ids.rootCategory}`);
        return !items.some((item) => item.id === id);
      });
    }
    await page.goto("/admin/product-brands");
    await expectDeleted(itemWith(products.names.brand), /\/api\/product-brands\/\d+$/, "product brand", async () => !(await listHas("/product-brands", products.ids.productBrand)));
    await page.goto("/admin/tags");
    await expectDeleted(itemWith(products.names.tag), /\/api\/tags\/\d+$/, "tag", async () => !(await listHas("/tags", products.ids.tag)));
  });
});

test.describe("ტექნიკა და კატეგორიები", () => {
  test("ტექნიკის ჩანაწერი განცხადების არსებობისას დაცულია; განცხადების წაშლა", async () => {
    await page.goto("/admin/vehicle-catalog");
    const iceEntry = page.locator("main table tbody tr:visible").filter({ hasText: catalog.names.model }).filter({ hasText: "2019" }).first();
    await expectInUse(iceEntry, /\/api\/vehicle-catalog\/\d+$/, "catalog entry with listing", async () =>
      (await page.request.get(`${BACKEND_URL}/api/vehicle-catalog/${catalog.ids.catalogEntry}`)).ok(),
    );
    await page.goto("/admin/vehicle-listings");
    await expectDeleted(itemWith(catalog.names.model), /\/api\/vehicle-listings\/\d+$/, "vehicle listing", async () =>
      (await page.request.get(`${BACKEND_URL}/api/vehicle-listings/${catalog.ids.listing}`)).status() === 404,
    );
  });

  test("ტექნიკის ჩანაწერები: სტუმრის გარაჟში მყოფი დაცულია (ადმინს გარაჟიდან ამოღება არ შეუძლია); დანარჩენი იშლება", async () => {
    await page.goto("/admin/vehicle-catalog");
    const rows = () => page.locator("main table tbody tr:visible").filter({ hasText: catalog.names.model });
    // Electric (2023) and the customer-submitted custom entry (2010) — their
    // garages went with the deleted customer accounts.
    for (const year of ["2023", "2010"]) {
      const row = rows().filter({ hasText: year }).first();
      if (!(await row.isVisible().catch(() => false))) continue;
      const result = await deleteVia(row, /\/api\/vehicle-catalog\/\d+$/, `catalog entry ${year}`);
      test.info().annotations.push({ type: "note", description: `catalog entry ${year}: ${result.outcome}` });
    }
    // The combustion entry is in walk-in customers' garages (service history).
    const ice = rows().filter({ hasText: "2019" }).first();
    const result = await deleteVia(ice, /\/api\/vehicle-catalog\/\d+$/, "catalog entry in walk-in garages");
    checkFinding(
      result.outcome === "deleted",
      "წაშლა: სტუმრის გარაჟში მყოფი ტექნიკის ჩანაწერი ვერ იშლება და ადმინს გარაჟიდან ამოღების/სტუმრის წაშლის საშუალება არ აქვს",
      `vehicle catalog ${catalog.ids.catalogEntry} → ${result.response.status()}; this also keeps its model, brand and category`,
    );
  });

  test("მოდელი, მარკა, ტრანსპორტის ტიპი (ჯერ კიდევ გამოყენებისას — დაცული); მთავარი კატეგორია იშლება", async () => {
    const entryLeft = (await page.request.get(`${BACKEND_URL}/api/vehicle-catalog/${catalog.ids.catalogEntry}`)).ok();
    await page.goto("/admin/models");
    const modelResult = await deleteVia(itemWith(catalog.names.model), /\/api\/models\/\d+$/, "model");
    expect(modelResult.outcome).toBe(entryLeft ? "in-use" : "deleted");
    await page.goto("/admin/brands");
    const brandResult = await deleteVia(itemWith(catalog.names.brand), /\/api\/brands\/\d+$/, "brand");
    expect(brandResult.outcome).toBe(modelResult.outcome === "deleted" ? "deleted" : "in-use");
    await page.goto("/admin/categories");
    const typeResult = await deleteVia(itemWith(catalog.names.vehicleCategoryKa), /\/api\/categories\/\d+$/, "vehicle type category");
    test.info().annotations.push({ type: "note", description: `vehicle type: ${typeResult.outcome}` });

    await expectDeleted(itemWith(catalog.names.rootCategoryKa), /\/api\/categories\/\d+$/, "root category", async () => {
      const { categories } = await apiGet<{ categories: { id: number }[] }>(page, "/categories");
      return !categories.some((category) => category.id === catalog.ids.rootCategory);
    });
  });
});

test.describe("კლასიფიკატორები", () => {
  const LOOKUPS = [
    ["/admin/classifiers", "fuel-types", "საწვავის ტიპები"],
    ["/admin/classifiers", "transmission-types", "გადაცემათა კოლოფის ტიპები"],
    ["/admin/classifiers", "cooling-types", "გაგრილების ტიპები"],
    ["/admin/classifiers", "final-drive-types", "გადაცემის ტიპები"],
    ["/admin/classifiers", "drive-types", "წამყვანი თვლების ტიპები"],
    ["/admin/classifiers", "start-types", "გაშვების სისტემა"],
    ["/admin/classifiers", "powertrain-types", "ძრავის კვების ტიპები"],
    ["/admin/general-classifiers", "conditions", "მდგომარეობები"],
    ["/admin/general-classifiers", "colors", "ფერები"],
    ["/admin/general-classifiers", "sizes", "ზომები"],
    ["/admin/general-classifiers", "cities", "ქალაქები"],
    ["/admin/general-classifiers", "cancellation-reasons", "გაუქმების მიზეზები"],
    ["/admin/general-classifiers", "positions", "თანამდებობები"],
    ["/admin/statuses", "listing-statuses", "განცხადების სტატუსები"],
  ] as const;

  for (const [path, slug, tab] of LOOKUPS) {
    test(`„${tab}“ — E2E ჩანაწერის წაშლა (ან დაცვა, თუ გამოიყენება)`, async () => {
      await page.goto(path);
      await openTab(page.locator("main"), tab);
      const name = `E2E-TEST ${tab} შეცვლილი ${classifiers.run}`;
      const result = await deleteVia(itemWith(name), new RegExp(`/api/lookups/${slug}/\\d+$`), `lookup ${slug}`);
      const exists = await listHas(`/lookups/${slug}`, classifiers.ids[slug]);
      expect(exists, `${slug}: outcome ${result.outcome} matches the API`).toBe(result.outcome === "in-use");
      if (slug === "cancellation-reasons") {
        // Used as the reason of a cancelled order — must stay.
        expect(result.outcome).toBe("in-use");
      }
      test.info().annotations.push({ type: "note", description: `${slug}: ${result.outcome}` });
    });
  }

  test("ერთეული და შეკვეთის სტატუსი", async () => {
    await page.goto("/admin/general-classifiers");
    await openTab(page.locator("main"), "ერთეულები");
    await expectDeleted(itemWith(`E2E-TEST ერთეული შეცვლილი ${classifiers.run}`), /\/api\/units\/\d+$/, "unit", async () => !(await listHas("/units", classifiers.ids.unit)));
    await page.goto("/admin/statuses");
    await openTab(page.locator("main"), "შეკვეთის სტატუსები");
    await expectDeleted(itemWith(`E2E-TEST სტატუსი შეცვლილი ${classifiers.run}`), /\/api\/order-statuses\/\d+$/, "order status", async () => !(await listHas("/order-statuses", classifiers.ids.orderStatus)));
  });
});
