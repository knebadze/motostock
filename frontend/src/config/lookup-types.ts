// order-statuses used to be listed here too, but it moved to its own
// dedicated module/admin page (needs an admin-controlled sortOrder the
// generic lookup shape doesn't support) — see @/lib/api/order-statuses and
// /admin/statuses.
export const LOOKUP_TYPES = [
  { slug: "fuel-types", label: "საწვავის ტიპები" },
  { slug: "transmission-types", label: "გადაცემათა კოლოფის ტიპები" },
  { slug: "cooling-types", label: "გაგრილების ტიპები" },
  { slug: "final-drive-types", label: "გადაცემის ტიპები" },
  { slug: "drive-types", label: "წამყვანი თვლების ტიპები" },
  { slug: "start-types", label: "გაშვების სისტემა" },
  { slug: "powertrain-types", label: "ძრავის კვების ტიპები" },
  { slug: "conditions", label: "მდგომარეობები" },
  { slug: "listing-statuses", label: "განცხადების სტატუსები" },
  { slug: "colors", label: "ფერები" },
  { slug: "sizes", label: "ზომები" },
  { slug: "cities", label: "ქალაქები" },
  { slug: "cancellation-reasons", label: "გაუქმების მიზეზები" },
] as const;

export type LookupTypeSlug = (typeof LOOKUP_TYPES)[number]["slug"];

export function getLookupTypeLabel(slug: LookupTypeSlug): string {
  return LOOKUP_TYPES.find((item) => item.slug === slug)?.label ?? slug;
}

// მხოლოდ ტექნიკის კატალოგის (VehicleCatalog) ტექნიკურ მახასიათებლებს ეხება.
const VEHICLE_ONLY_SLUGS = new Set<LookupTypeSlug>([
  "fuel-types",
  "transmission-types",
  "cooling-types",
  "final-drive-types",
  "drive-types",
  "start-types",
  "powertrain-types",
]);

// გატანილია ცალკე „სტატუსები" გვერდზე (შეკვეთის სტატუსებთან ერთად) და არა
// საერთო კლასიფიკატორებში.
const STATUS_SLUGS = new Set<LookupTypeSlug>(["listing-statuses"]);

export const VEHICLE_LOOKUP_TYPES = LOOKUP_TYPES.filter((item) =>
  VEHICLE_ONLY_SLUGS.has(item.slug),
);

// „სტატუსები" გვერდისთვის — იხ. /admin/statuses.
export const STATUS_LOOKUP_TYPES = LOOKUP_TYPES.filter((item) => STATUS_SLUGS.has(item.slug));

// გამოიყენება როგორც გასაყიდ ტექნიკაში (VehicleListing), ისე პროდუქტის ვარიანტებში (ProductVariant).
export const GENERAL_LOOKUP_TYPES = LOOKUP_TYPES.filter(
  (item) => !VEHICLE_ONLY_SLUGS.has(item.slug) && !STATUS_SLUGS.has(item.slug),
);
