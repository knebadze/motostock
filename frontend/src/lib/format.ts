// Deliberately not using Number.prototype.toLocaleString("ka-GE") here: Node's
// default (non full-icu) build lacks real Georgian locale data, so it
// silently formats differently server-side than a real browser does
// client-side — causing a React hydration mismatch. This manual formatter
// produces the same byte-identical output in both environments.
export function formatPrice(value: number): string {
  const fixed = value.toFixed(2);
  const [integerPart, decimalPart] = fixed.split(".");
  const withSeparators = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const hasCents = decimalPart !== "00";
  return `${withSeparators}${hasCents ? `.${decimalPart}` : ""} ₾`;
}

// Georgia has a single fixed UTC+4 offset year-round (no DST) — mirrors
// backend/src/lib/tbilisi-dates.ts. Every date helper below shifts the UTC
// instant forward by this much and then reads it back with *UTC* getters
// (getUTCDate/getUTCHours/etc, never getDate/getHours) — that's what makes
// these deterministic: getDate()/getHours() read the *runtime's own local
// timezone*, which is Tbilisi in a real user's browser but UTC on this
// app's server (Docker's Node image, no TZ env var set). A Server Component
// calling the old local-getter version rendered timestamps ~4 hours (and,
// near local midnight, up to a full calendar day) off from what a Georgia-
// based visitor should see, permanently (Server Component output is never
// re-rendered client-side to "correct" it) — and the same mismatch between
// server (UTC) and client (Tbilisi) locals caused React hydration warnings
// wherever a "use client" component formatted a server-fetched date during
// its own first render. Shifting explicitly and reading with UTC getters
// sidesteps the runtime's local timezone entirely, so server and client
// (and everyone's browser, regardless of their own OS timezone) render the
// identical, Tbilisi-correct string — same "byte-identical regardless of
// environment" rationale as formatPrice above, just for timezone instead of
// ICU data.
const TBILISI_OFFSET_MS = 4 * 60 * 60 * 1000;

function toTbilisiWallClock(iso: string): Date {
  return new Date(new Date(iso).getTime() + TBILISI_OFFSET_MS);
}

export function formatDateTime(iso: string): string {
  const date = toTbilisiWallClock(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${date.getUTCFullYear()} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

export function formatDate(iso: string): string {
  const date = toTbilisiWallClock(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${date.getUTCFullYear()}`;
}

export function toTbilisiDateOnly(iso: string): string {
  return toTbilisiWallClock(iso).toISOString().slice(0, 10);
}

// Lookup rows (Size/Color/Condition/ListingStatus/etc.) store one flat name
// per locale instead of a nested LocalizedString — this picks the right one.
export function pickLookupName(
  item: { nameKa: string; nameEn: string; nameRu: string },
  locale: "ka" | "en" | "ru",
): string {
  if (locale === "en") return item.nameEn;
  if (locale === "ru") return item.nameRu;
  return item.nameKa;
}

// "გიორგი მამაცაშვილი" -> "გ. მამაცაშვილი" — shortens a full name to
// first-name initial plus the full last name, so the header's account
// button stays compact regardless of how long a user's name is. Single-word
// names pass through unchanged (nothing to shorten).
export function formatShortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;

  const firstInitial = parts[0].charAt(0).toUpperCase();
  const lastName = parts.slice(1).join(" ");
  return `${firstInitial}. ${lastName}`;
}

// "Brand Model variant (yearFrom–yearTo)" — the display label for a vehicle
// catalog entry, used anywhere one needs to be shown to a customer (garage
// cards/forms, the "my vehicle" shop filter, the compatible-products page).
// Brand/Model names are locale-invariant, so this needs no locale argument.
export function formatVehicleCatalogLabel(entry: {
  brand: { name: string };
  model: { name: string };
  variant: string;
  yearFrom: number | null;
  yearTo: number | null;
}): string {
  const year =
    entry.yearFrom || entry.yearTo ? ` (${entry.yearFrom ?? "?"}–${entry.yearTo ?? "?"})` : "";
  const variant = entry.variant ? ` ${entry.variant}` : "";
  return `${entry.brand.name} ${entry.model.name}${variant}${year}`;
}
