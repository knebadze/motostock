import { deflateSync, crc32 } from "node:zlib";
import { expect, type Locator, type Page, type Response } from "@playwright/test";
import { BACKEND_URL, BASE_URL } from "../../env.js";

// Shared building blocks for the admin create/edit suites (tests/admin/*).
// Every helper drives the real UI; the backend is only read back (via the
// admin's own session cookie) to verify what actually got persisted.

const API = `${BACKEND_URL}/api`;

// The admin panel's shared Modal — scoped so a selector never matches the
// list page behind it. `:visible` because Next's dev overlay keeps its own
// hidden role="dialog" in a shadow root that Playwright's CSS pierces.
// DateInput's calendar panel is a role="dialog" too, but has no h2 title.
export function modal(page: Page): Locator {
  return page.locator('[role="dialog"]:visible').filter({ has: page.locator("h2") }).last();
}

// Picks a date in the shared DateInput (custom calendar): "today", or day
// `day` of the month `monthsAhead` months from now.
export async function pickDate(
  page: Page,
  trigger: Locator,
  when: "today" | { monthsAhead: number; day: number; year?: number },
): Promise<void> {
  await trigger.click();
  const panel = page.locator('[role="dialog"]:visible').filter({ hasNot: page.locator("h2") }).last();
  await expect(panel).toBeVisible();
  if (when === "today") {
    await panel.getByRole("button", { name: "დღეს", exact: true }).click();
    return;
  }
  if (when.year !== undefined) {
    await panel.getByRole("button", { name: "აირჩიეთ წელი", exact: true }).click();
    await panel.getByRole("button", { name: String(when.year), exact: true }).click();
  }
  for (let i = 0; i < when.monthsAhead; i++) {
    await panel.getByRole("button", { name: "შემდეგი თვე", exact: true }).click();
  }
  // Leading/trailing days of the neighbouring months are dimmed (/50).
  await panel
    .locator('button:not([class*="text-muted-foreground/50"])', { hasText: new RegExp(`^${when.day}$`) })
    .click();
}

// Picks an option in the shared Select (components/shared/Select.tsx) by its
// trigger id. `option` is either the exact visible label or an index into the
// (possibly filtered) option list. Returns the label that got picked.
export async function pickSelect(
  page: Page,
  triggerId: string,
  option: string | number,
  { search }: { search?: string } = {},
): Promise<string> {
  await page.locator(`#${triggerId}`).click();
  const listbox = page.locator('[role="listbox"]:visible').last();
  await expect(listbox).toBeVisible();
  if (search !== undefined || typeof option === "string") {
    const searchBox = page.locator('[role="combobox"]:visible').last();
    if (await searchBox.count()) {
      await searchBox.fill(search ?? (option as string));
    }
  }
  const target =
    typeof option === "number"
      ? listbox.getByRole("option").nth(option)
      : listbox.getByRole("option", { name: optionName(option) }).first();
  const label = ((await target.textContent()) ?? "").replace("✓", "").trim();
  await target.click();
  // Single-selects close themselves; multi-selects stay open (and focus has
  // left the panel, so Escape wouldn't reach it) — toggle via the trigger.
  if (await listbox.isVisible()) await page.locator(`#${triggerId}`).click();
  await expect(listbox).toBeHidden();
  return label;
}

// An already-selected option's accessible name carries a trailing "✓".
function optionName(label: string): RegExp {
  return new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}( ✓)?$`);
}

// Same as pickSelect, but addressed by aria-label (for Selects rendered
// without an id, e.g. the listing form's currency picker).
export async function pickSelectByLabel(
  page: Page,
  ariaLabel: string,
  option: string | number,
  scope: Page | Locator = page,
): Promise<void> {
  await scope.getByRole("button", { name: ariaLabel, exact: true }).click();
  const listbox = page.locator('[role="listbox"]:visible').last();
  const target =
    typeof option === "number"
      ? listbox.getByRole("option").nth(option)
      : listbox.getByRole("option", { name: optionName(option) }).first();
  await target.click();
}

// Replaces the content of the nth visible Tiptap editor inside `scope`.
export async function fillRichText(scope: Locator, index: number, text: string): Promise<void> {
  const editor = scope.locator(".ProseMirror:visible").nth(index);
  await expect(editor).toBeVisible({ timeout: 15_000 });
  await editor.click();
  await editor.press("ControlOrMeta+a");
  await editor.press("Backspace");
  await editor.pressSequentially(text);
}

export async function openTab(scope: Locator, label: string): Promise<void> {
  await scope.getByRole("button", { name: label, exact: true }).click();
}

// Sets a role="switch" Toggle (components/shared/Toggle.tsx) to `on`.
export async function setSwitch(scope: Locator, label: string, on: boolean): Promise<void> {
  const toggle = scope.getByRole("switch", { name: label, exact: true });
  if ((await toggle.getAttribute("aria-checked")) !== String(on)) await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", String(on));
}

// A real, decodable PNG (solid color) — the backend re-encodes every upload
// through libvips, so a fake byte blob would be rejected.
export function testPng(name: string, rgb: [number, number, number] = [220, 60, 30], size = 64) {
  const row = Buffer.alloc(1 + size * 3);
  for (let x = 0; x < size; x++) row.set(rgb, 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typed) >>> 0);
    return Buffer.concat([length, typed, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const buffer = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return { name, mimeType: "image/png", buffer };
}

// Starts waiting for the backend write a form submit triggers. Call before
// clicking save, await after.
export function waitForApi(page: Page, method: string, path: RegExp): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.request().method() === method &&
      path.test(new URL(response.url()).pathname) &&
      response.url().startsWith(API),
    { timeout: 20_000 },
  );
}

// Clicks the modal's save button and waits for the modal to close. Fails
// with whatever error toast appeared instead, so the report shows the
// actual message the admin would have seen.
export async function submitModal(page: Page, label = "შენახვა"): Promise<void> {
  const dialog = modal(page);
  await dialog.getByRole("button", { name: label, exact: true }).click();
  const closed = dialog.waitFor({ state: "detached", timeout: 20_000 }).then(() => "closed" as const);
  const toastError = page
    .locator("[data-sonner-toast][data-type='error']")
    .first()
    .waitFor({ timeout: 20_000 })
    .then(() => "error" as const);
  const outcome = await Promise.race([closed, toastError]);
  // Partial failures (record saved, image upload rejected) show an error
  // toast AND close the modal — give that toast a moment to appear.
  if (outcome === "closed") await page.waitForTimeout(400);
  if (outcome === "error" || (await page.locator("[data-sonner-toast][data-type='error']").count()) > 0) {
    const message = await page.locator("[data-sonner-toast][data-type='error']").first().innerText();
    throw new Error(`save failed with error toast: ${message}`);
  }
}

export async function expectSuccessToast(page: Page, text: string): Promise<void> {
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible();
}

// Desktop DataTable row containing `text`.
export function tableRow(page: Page, text: string): Locator {
  return page.locator("table tbody tr").filter({ hasText: text }).first();
}

export async function clickRowAction(page: Page, rowText: string, action: "რედაქტირება" | "სრულად ნახვა" | "წაშლა") {
  const row = tableRow(page, rowText);
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: action, exact: true }).click();
}

// Reads back through the backend with the logged-in admin's cookies.
export async function apiGet<T = Record<string, unknown>>(page: Page, path: string): Promise<T> {
  const response = await page.request.get(`${API}${path}`);
  expect(response.status(), `GET ${path}`).toBe(200);
  return (await response.json()) as T;
}

// Drops every storefront unstable_cache entry (same as the admin's "clear
// cache" button) — needed after restoring real content via the API, which
// skips the frontend revalidation the admin UI does on its own saves.
export async function revalidateStorefront(page: Page): Promise<void> {
  const response = await page.request.post(`${BASE_URL}/api/revalidate`, { data: { tag: "all" } });
  expect(response.ok(), `revalidate: ${await response.text()}`).toBe(true);
}
