import type { HeroSlideType } from "@/lib/api/hero-slides";

// Single source for every HeroSlideType -> label mapping — previously
// HeroSlidesManager.tsx (a short list-row badge label) and
// HeroSlideFormModal.tsx (a more descriptive dropdown-option label, plus its
// own separate helper-text paragraph) each hand-encoded the same 5-key enum
// independently. The two label styles are intentionally different lengths
// for their different contexts (a compact list badge vs. an explanatory
// form picker) — this doesn't force them to match, it just keeps all three
// views of the same enum in one reviewed place, so adding/renaming a type
// can't update one view and silently forget another the way
// VEHICLE_SEARCH/CATEGORY_FILTER/DISCOUNT/INFO's list-vs-picker wording had
// already drifted apart before this.
export const HERO_SLIDE_TYPE_SHORT_LABELS: Record<HeroSlideType, string> = {
  CTA: "ღილაკი (CTA)",
  DISCOUNT: "ფასდაკლება",
  VEHICLE_SEARCH: "ტრანსპორტის ძებნა",
  CATEGORY_FILTER: "კატეგორიის არჩევა",
  INFO: "საინფორმაციო",
};

export const HERO_SLIDE_TYPE_PICKER_LABELS: Record<HeroSlideType, string> = {
  CTA: "ღილაკი (CTA)",
  DISCOUNT: "ფასდაკლება (ბმული ავტომატურად)",
  VEHICLE_SEARCH: "ტრანსპორტის ძებნის ფორმა",
  CATEGORY_FILTER: "კატეგორიის არჩევის ფორმა",
  INFO: "საინფორმაციო (ღილაკის/ფორმის გარეშე)",
};

export const HERO_SLIDE_TYPE_OPTIONS: { value: HeroSlideType; label: string }[] = (
  Object.keys(HERO_SLIDE_TYPE_PICKER_LABELS) as HeroSlideType[]
).map((value) => ({ value, label: HERO_SLIDE_TYPE_PICKER_LABELS[value] }));

export const HERO_SLIDE_TYPE_DESCRIPTIONS: Record<HeroSlideType, string> = {
  CTA: "ფონური სურათი, სათაური, ქვესათაური და ღილაკი, რომელიც მითითებულ ბმულზე გადადის.",
  DISCOUNT:
    "ფონური სურათი, სათაური, ქვესათაური და ღილაკი — ბმული ავტომატურად გამოითვლება არჩეული კატეგორია/ბრენდის მიხედვით (ან ზოგადი ფასდაკლების გვერდი, თუ არცერთი არ აირჩევა).",
  VEHICLE_SEARCH: "ფონური სურათი, სათაური, ქვესათაური და მარკა/მოდელი/წელი ძებნის ფორმა.",
  CATEGORY_FILTER:
    "ფონური სურათი, სათაური, ქვესათაური და კატეგორიის არჩევის ფორმა — მომხმარებელი აირჩევს კატეგორიას და გადავა შესაბამის გვერდზე.",
  INFO: "მხოლოდ ფონური სურათი, სათაური და ქვესათაური — არც ღილაკი, არც ფორმა.",
};
