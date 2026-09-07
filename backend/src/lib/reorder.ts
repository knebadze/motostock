// Validates that `ids` is a genuine permutation of `existingIds` — every
// existing id appears exactly once, nothing extra, nothing missing. Used by
// every simple admin "drag to reorder" endpoint (hero-slides, banks, faq,
// team-members) before writing each id's new sortOrder.
//
// A plain "same length + every id is a member" check — what each of those
// four independently had before this was extracted — doesn't actually
// enforce a permutation: a payload like [1,1,3] against an existing set
// [1,2,3] passes it (same length, every element is a member) even though id
// 2 is silently dropped and id 1 is duplicated. Each repository's reorder()
// then fires one concurrent sortOrder update per array entry, so the
// duplicated id races itself (final value non-deterministic) while the
// dropped id is left with a now-inconsistent stale sortOrder. Requiring the
// *set* of submitted ids (not just each individually) to equal the existing
// set closes this — a set of N distinct values drawn from a domain of
// exactly N values can only be that entire domain, i.e. a true permutation.
export function isReorderPermutation(ids: number[], existingIds: Set<number>): boolean {
  return (
    ids.length === existingIds.size &&
    new Set(ids).size === ids.length &&
    ids.every((id) => existingIds.has(id))
  );
}
