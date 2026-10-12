// The homepage "seasonal products" carousel (HomepageSectionType
// SEASONAL_PRODUCTS): which season it is now, as the AttributeOption keys a
// product's season attribute uses (the seeded "სეზონი" SELECT on gear —
// SUMMER / WINTER / ALL_SEASON). Matched by option KEY, not attribute name,
// so any SELECT attribute using these keys counts (e.g. a future tire
// season attribute). ALL_SEASON is deliberately not "seasonal".
//
// Georgia's riding season: April–September is summer, October–March winter.
export type SeasonKey = "SUMMER" | "WINTER";

const SUMMER_MONTHS = new Set([3, 4, 5, 6, 7, 8]); // Apr..Sep (0-based)

export function currentSeasonKey(now: Date = new Date()): SeasonKey {
  return SUMMER_MONTHS.has(now.getMonth()) ? "SUMMER" : "WINTER";
}
