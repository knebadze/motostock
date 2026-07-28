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
