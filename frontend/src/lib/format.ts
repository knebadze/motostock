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

type LocalizedName = { ka: string; en: string; ru: string };

// "Brand Model variant (yearFrom–yearTo)" — the display label for a vehicle
// catalog entry, used anywhere one needs to be shown to a customer (garage
// cards/forms, the "my vehicle" shop filter, the compatible-products page).
export function formatVehicleCatalogLabel(
  entry: {
    brand: { name: LocalizedName };
    model: { name: LocalizedName };
    variant: string;
    yearFrom: number | null;
    yearTo: number | null;
  },
  locale: "ka" | "en" | "ru",
): string {
  const year =
    entry.yearFrom || entry.yearTo ? ` (${entry.yearFrom ?? "?"}–${entry.yearTo ?? "?"})` : "";
  const variant = entry.variant ? ` ${entry.variant}` : "";
  return `${entry.brand.name[locale]} ${entry.model.name[locale]}${variant}${year}`;
}
