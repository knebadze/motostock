// Domain-agnostic building blocks for the admin "filter everything" system —
// every admin filter registry (vehicle-catalog, categories, vehicle-listing,
// products) is a map of key -> handler built from these few shapes, instead
// of a bespoke class per key. Each function returns `null` when the value
// doesn't produce a meaningful clause (empty array, both min/max missing,
// blank string), so callers can skip null results when ANDing clauses together.

// Builds a nested where-object from a field path, e.g.
// nestPath(["vehicleCatalog", "fuelTypeId"], { in: [1, 2] })
//   => { vehicleCatalog: { fuelTypeId: { in: [1, 2] } } }
function nestPath(path: string[], leaf: unknown): Record<string, unknown> {
  return path.reduceRight<unknown>((acc, key) => ({ [key]: acc }), leaf) as Record<string, unknown>;
}

export function buildRangeClause(
  path: string[],
  value: { min?: number; max?: number } | null | undefined,
): Record<string, unknown> | null {
  if (!value || (value.min == null && value.max == null)) return null;
  return nestPath(path, {
    ...(value.min != null ? { gte: value.min } : {}),
    ...(value.max != null ? { lte: value.max } : {}),
  });
}

export function buildInClause(
  path: string[],
  value: unknown[] | null | undefined,
): Record<string, unknown> | null {
  if (!value || value.length === 0) return null;
  return nestPath(path, { in: value });
}

export function buildEqualsTrueClause(path: string[]): Record<string, unknown> {
  return nestPath(path, true);
}

export function buildContainsAnyClause(
  paths: string[][],
  value: string | null | undefined,
): { OR: Record<string, unknown>[] } | null {
  if (!value || !value.trim()) return null;
  return { OR: paths.map((path) => nestPath(path, { contains: value, mode: "insensitive" })) };
}

// --- to-many relation ("some") variants — needed wherever the filterable
// column lives on a related list (ProductVariant, ProductAttributeValue)
// rather than directly on the filtered model itself. `relationField` is the
// column name inside that related record (e.g. "price", "stockQuantity").
// `extraMatch`, when given, is merged into the same `some` block alongside
// the leaf condition — needed for e.g. product attribute filters, where a
// row must match `attributeId` AND the value/option condition together
// (matching one attribute's answer, not any attribute's).

export function buildRangeInSomeClause(
  relationKey: string,
  relationField: string,
  value: { min?: number; max?: number } | null | undefined,
  extraMatch?: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!value || (value.min == null && value.max == null)) return null;
  return {
    [relationKey]: {
      some: {
        ...extraMatch,
        [relationField]: {
          ...(value.min != null ? { gte: value.min } : {}),
          ...(value.max != null ? { lte: value.max } : {}),
        },
      },
    },
  };
}

export function buildInClauseInSome(
  relationKey: string,
  relationField: string,
  value: unknown[] | null | undefined,
  extraMatch?: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!value || value.length === 0) return null;
  return { [relationKey]: { some: { ...extraMatch, [relationField]: { in: value } } } };
}

export function buildEqualsTrueInSomeClause(
  relationKey: string,
  relationField: string,
  extraMatch?: Record<string, unknown>,
): Record<string, unknown> {
  return { [relationKey]: { some: { ...extraMatch, [relationField]: true } } };
}

export function buildContainsInSomeClause(
  relationKey: string,
  relationField: string,
  value: string | null | undefined,
  extraMatch?: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!value || !value.trim()) return null;
  return {
    [relationKey]: {
      some: { ...extraMatch, [relationField]: { contains: value, mode: "insensitive" } },
    },
  };
}
