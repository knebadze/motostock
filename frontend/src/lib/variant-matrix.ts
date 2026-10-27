export type VariantCombination = { sizeId: number | null; colorId: number | null };

// Cartesian product of the selected size/color ids. An empty axis is treated
// as "not part of the matrix" rather than "no variants" — leaving both empty
// yields exactly one combination (a plain, option-less variant), so a single
// size+color selection collapses to the same one-row result the old
// single-variant form used to produce.
export function generateVariantCombinations(
  sizeIds: number[],
  colorIds: number[],
): VariantCombination[] {
  if (sizeIds.length === 0 && colorIds.length === 0) {
    return [{ sizeId: null, colorId: null }];
  }
  if (sizeIds.length === 0) {
    return colorIds.map((colorId) => ({ sizeId: null, colorId }));
  }
  if (colorIds.length === 0) {
    return sizeIds.map((sizeId) => ({ sizeId, colorId: null }));
  }

  const combinations: VariantCombination[] = [];
  for (const sizeId of sizeIds) {
    for (const colorId of colorIds) {
      combinations.push({ sizeId, colorId });
    }
  }
  return combinations;
}

// SKUs are unique per variant (ProductVariant.sku @unique), so a base SKU
// entered once for a whole generated batch can't be copied verbatim onto
// every row — each row gets the base plus its size/color keys
// ("JKT-100" → "JKT-100-XL-BLACK"). A single generated variant keeps the
// base exactly as typed.
export function variantSkuFromBase(
  baseSku: string,
  combo: VariantCombination,
  batchSize: number,
  lookups: { sizes: { id: number; key: string }[]; colors: { id: number; key: string }[] },
): string {
  const base = baseSku.trim();
  if (!base || batchSize <= 1) return base;
  const suffix = [
    combo.sizeId != null ? lookups.sizes.find((size) => size.id === combo.sizeId)?.key ?? String(combo.sizeId) : null,
    combo.colorId != null ? lookups.colors.find((color) => color.id === combo.colorId)?.key ?? String(combo.colorId) : null,
  ]
    .filter(Boolean)
    .join("-");
  return suffix ? `${base}-${suffix}` : base;
}
