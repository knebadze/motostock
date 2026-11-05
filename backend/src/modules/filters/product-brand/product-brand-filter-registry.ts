import type { Prisma } from "../../../generated/prisma/index.js";
import type { FilterEntry } from "../filter-request.schema.js";
import { buildContainsAnyClause, buildInClauseInSome } from "../filter-clause-builders.js";

type Handler = (value: unknown) => Record<string, unknown> | null;

function asText(value: unknown) {
  return value as string | null | undefined;
}

function asArray(value: unknown) {
  return value as unknown[] | null | undefined;
}

const HANDLERS: Record<string, Handler> = {
  NAME: (value) => buildContainsAnyClause([["name"]], asText(value)),
  CATEGORY: (value) => buildInClauseInSome("categories", "categoryId", asArray(value)),
};

export function applyProductBrandAdminFilters(
  entries: FilterEntry[] | undefined,
): Prisma.ProductBrandWhereInput | undefined {
  if (!entries || entries.length === 0) return undefined;

  const and: Prisma.ProductBrandWhereInput[] = [];
  for (const entry of entries) {
    const handler = HANDLERS[entry.key];
    if (!handler) continue;
    const clause = handler(entry.value);
    if (clause) and.push(clause as Prisma.ProductBrandWhereInput);
  }

  return and.length > 0 ? { AND: and } : undefined;
}
