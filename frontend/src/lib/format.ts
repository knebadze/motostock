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

// Same deterministic-formatting rationale as formatPrice above — manual
// padStart formatting instead of toLocaleString, so server and client render
// byte-identical output regardless of ICU data availability.
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

// Mirrors backend/src/lib/tbilisi-dates.ts's toTbilisiDateOnly — admin
// discount/promo-code dates are stored as the start/end instant of a
// Tbilisi (UTC+4, no DST) calendar day, not UTC midnight. A plain
// `iso.slice(0, 10)` on the returned instant reads the *UTC* calendar date
// instead, which is a day early for anything stored as Tbilisi midnight
// (e.g. a discount's startDate) — this reads back the Tbilisi date the
// backend actually meant instead.
const TBILISI_OFFSET_MS = 4 * 60 * 60 * 1000;

export function toTbilisiDateOnly(iso: string): string {
  return new Date(new Date(iso).getTime() + TBILISI_OFFSET_MS).toISOString().slice(0, 10);
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
