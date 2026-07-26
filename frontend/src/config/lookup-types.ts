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
] as const;

export type LookupTypeSlug = (typeof LOOKUP_TYPES)[number]["slug"];

export function getLookupTypeLabel(slug: LookupTypeSlug): string {
  return LOOKUP_TYPES.find((item) => item.slug === slug)?.label ?? slug;
}
