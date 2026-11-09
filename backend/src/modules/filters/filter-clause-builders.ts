// Domain-agnostic building blocks for the admin "filter everything" system —
// every admin filter registry (vehicle-catalog, categories, vehicle-listing,
// products) is a map of key -> handler built from these few shapes, instead
// of a bespoke class per key. Each function returns `null` when the value
// doesn't produce a meaningful clause (empty array, both min/max missing,
// blank string), so callers can skip null results when ANDing clauses together.

import { ApiError } from "../../lib/ApiError.js";

// Each filter's `value` arrives as untrusted JSON (filter-request.schema.ts
// only checks the entry's shape) — on public endpoints too (e.g. GET
// /categories). Every builder below validates and normalizes it first: a
// wrong type used to reach Prisma (or `.trim()` a number) and fail as a 500,
// each one written to the ErrorLog — anyone could fill it. Now it's a 400.
const MAX_IN_VALUES = 500;
const MAX_TEXT_LENGTH = 200;

function invalidFilterValue(): never {
  throw new ApiError(400, "ფილტრის მნიშვნელობა არასწორია", "INVALID_FILTER_VALUE");
}

// Every in-list filter targets an id column: positive integers (numeric
// strings accepted), at most MAX_IN_VALUES.
function toIdList(value: unknown): number[] | null {
  if (value == null) return null;
  if (!Array.isArray(value) || value.length > MAX_IN_VALUES) invalidFilterValue();
  return value.map((item) => {
    const id = typeof item === "string" && item.trim() !== "" ? Number(item) : item;
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) invalidFilterValue();
    return id;
  });
}

// { min?, max? } of finite numbers (numeric strings accepted). Date columns
// (createdAt/updatedAt — the path ends in "At") take them as epoch ms.
function toRange(path: string[], value: unknown): { min?: number | Date; max?: number | Date } | null {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) invalidFilterValue();
  const isDate = /At$/.test(path[path.length - 1] ?? "");
  const bound = (raw: unknown): number | Date | undefined => {
    if (raw == null || raw === "") return undefined;
    const number = typeof raw === "string" ? Number(raw) : raw;
    if (typeof number !== "number" || !Number.isFinite(number)) invalidFilterValue();
    if (!isDate) return number;
    const date = new Date(number);
    if (Number.isNaN(date.getTime())) invalidFilterValue();
    return date;
  };
  const { min, max } = value as { min?: unknown; max?: unknown };
  return { min: bound(min), max: bound(max) };
}

function toText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string" || value.length > MAX_TEXT_LENGTH) invalidFilterValue();
  return value;
}

// Builds a nested where-object from a field path, e.g.
// nestPath(["vehicleCatalog", "fuelTypeId"], { in: [1, 2] })
//   => { vehicleCatalog: { fuelTypeId: { in: [1, 2] } } }
function nestPath(path: string[], leaf: unknown): Record<string, unknown> {
  return path.reduceRight<unknown>((acc, key) => ({ [key]: acc }), leaf) as Record<string, unknown>;
}

export function buildRangeClause(path: string[], rawValue: unknown): Record<string, unknown> | null {
  const value = toRange(path, rawValue);
  if (!value || (value.min == null && value.max == null)) return null;
  return nestPath(path, {
    ...(value.min != null ? { gte: value.min } : {}),
    ...(value.max != null ? { lte: value.max } : {}),
  });
}

export function buildInClause(path: string[], rawValue: unknown): Record<string, unknown> | null {
  const value = toIdList(rawValue);
  if (!value || value.length === 0) return null;
  return nestPath(path, { in: value });
}

export function buildEqualsTrueClause(path: string[]): Record<string, unknown> {
  return nestPath(path, true);
}

export function buildContainsAnyClause(paths: string[][], rawValue: unknown): { OR: Record<string, unknown>[] } | null {
  const value = toText(rawValue);
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
  rawValue: unknown,
  extraMatch?: Record<string, unknown>,
): Record<string, unknown> | null {
  const value = toRange([relationField], rawValue);
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
  rawValue: unknown,
  extraMatch?: Record<string, unknown>,
): Record<string, unknown> | null {
  const value = toIdList(rawValue);
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
  rawValue: unknown,
  extraMatch?: Record<string, unknown>,
): Record<string, unknown> | null {
  const value = toText(rawValue);
  if (!value || !value.trim()) return null;
  return {
    [relationKey]: {
      some: { ...extraMatch, [relationField]: { contains: value, mode: "insensitive" } },
    },
  };
}
