// Pure selection step of the tag-based buy-together fill (see
// products.service.ts's findTagCompanions): walks the SQL-ranked candidate
// ids in order, keeping those that passed the eligibility filter (stock,
// online purchase, vehicle compatibility) and aren't already shown, up to
// `limit`. Kept separate so the ordering/exclusion rules are unit-testable
// without a database.
export function pickTagCompanionIds(
  rankedIds: number[],
  eligibleIds: Set<number>,
  excludeIds: Set<number>,
  limit: number,
): number[] {
  const picked: number[] = [];
  for (const id of rankedIds) {
    if (picked.length >= limit) break;
    if (!eligibleIds.has(id) || excludeIds.has(id) || picked.includes(id)) continue;
    picked.push(id);
  }
  return picked;
}
