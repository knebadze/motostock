import type { Prisma } from "../../../generated/prisma/index.js";
import type { FilterEntry } from "../filter-request.schema.js";
import { buildContainsAnyClause, buildInClause, buildRangeClause } from "../filter-clause-builders.js";

type Handler = (value: unknown) => Record<string, unknown> | null;

const HANDLERS: Record<string, Handler> = {
  NAME: (value) =>
    buildContainsAnyClause(
      [["nameKa"], ["nameEn"], ["nameRu"]],
      value as string | null | undefined,
    ),
  SLUG: (value) => buildContainsAnyClause([["slug"]], value as string | null | undefined),
  PARENT: (value) => buildInClause(["parentId"], value as unknown[] | null | undefined),
  SORT_ORDER: (value) =>
    buildRangeClause(["sortOrder"], value as { min?: number; max?: number } | null | undefined),
  CREATED_AT: (value) =>
    buildRangeClause(["createdAt"], value as { min?: number; max?: number } | null | undefined),
  UPDATED_AT: (value) =>
    buildRangeClause(["updatedAt"], value as { min?: number; max?: number } | null | undefined),
};

export function applyCategoryAdminFilters(
  entries: FilterEntry[] | undefined,
): Prisma.CategoryWhereInput | undefined {
  if (!entries || entries.length === 0) return undefined;

  const and: Prisma.CategoryWhereInput[] = [];
  for (const entry of entries) {
    const handler = HANDLERS[entry.key];
    if (!handler) continue;
    const clause = handler(entry.value);
    if (clause) and.push(clause as Prisma.CategoryWhereInput);
  }

  return and.length > 0 ? { AND: and } : undefined;
}
