import { prisma } from "../../../config/prisma.js";
import type { Prisma } from "../../../generated/prisma/index.js";
import type { FilterEntry } from "../filter-request.schema.js";
import {
  buildContainsAnyClause,
  buildContainsInSomeClause,
  buildEqualsTrueInSomeClause,
  buildInClause,
  buildInClauseInSome,
  buildRangeClause,
  buildRangeInSomeClause,
} from "../filter-clause-builders.js";

type Handler = (value: unknown) => Record<string, unknown> | null;

function asRange(value: unknown) {
  return value as { min?: number; max?: number } | null | undefined;
}

function asArray(value: unknown) {
  return value as unknown[] | null | undefined;
}

function asText(value: unknown) {
  return value as string | null | undefined;
}

const ATTRIBUTE_KEY_PREFIX = "ATTRIBUTE:";

const FIXED_HANDLERS: Record<string, Handler> = {
  ID: (value) => buildInClause(["id"], asArray(value)),
  SLUG: (value) => buildContainsAnyClause([["slug"]], asText(value)),
  CATEGORY: (value) => buildInClause(["categoryId"], asArray(value)),
  BRAND: (value) => buildInClause(["productBrandId"], asArray(value)),
  SEARCH: (value) =>
    buildContainsAnyClause([["nameKa"], ["nameEn"], ["nameRu"]], asText(value)),
  PRICE: (value) => buildRangeInSomeClause("variants", "price", asRange(value)),
  STOCK_QUANTITY: (value) => buildRangeInSomeClause("variants", "stockQuantity", asRange(value)),
  SKU: (value) => buildContainsInSomeClause("variants", "sku", asText(value)),
  IS_ACTIVE: () => buildEqualsTrueInSomeClause("variants", "isActive"),
  SIZE: (value) => buildInClauseInSome("variants", "sizeId", asArray(value)),
  COLOR: (value) => buildInClauseInSome("variants", "colorId", asArray(value)),
  CONDITION: (value) => buildInClauseInSome("variants", "conditionId", asArray(value)),
  STATUS: (value) => buildInClauseInSome("variants", "statusId", asArray(value)),
  CREATED_AT: (value) => buildRangeClause(["createdAt"], asRange(value)),
  UPDATED_AT: (value) => buildRangeClause(["updatedAt"], asRange(value)),
};

export async function applyProductAdminFilters(
  entries: FilterEntry[] | undefined,
): Promise<Prisma.ProductWhereInput | undefined> {
  if (!entries || entries.length === 0) return undefined;

  const and: Prisma.ProductWhereInput[] = [];

  const attributeEntries = entries.filter((entry) => entry.key.startsWith(ATTRIBUTE_KEY_PREFIX));
  const attributeIds = attributeEntries
    .map((entry) => Number(entry.key.slice(ATTRIBUTE_KEY_PREFIX.length)))
    .filter((id) => Number.isInteger(id) && id > 0);

  const attributeById =
    attributeIds.length > 0
      ? new Map(
          (
            await prisma.attribute.findMany({
              where: { id: { in: attributeIds } },
              select: { id: true, valueType: true },
            })
          ).map((attribute) => [attribute.id, attribute.valueType]),
        )
      : new Map<number, string>();

  for (const entry of entries) {
    if (entry.key.startsWith(ATTRIBUTE_KEY_PREFIX)) {
      const attributeId = Number(entry.key.slice(ATTRIBUTE_KEY_PREFIX.length));
      const valueType = attributeById.get(attributeId);
      if (!valueType) continue;

      const extraMatch = { attributeId };
      let clause: Record<string, unknown> | null;
      if (valueType === "SELECT") {
        clause = buildInClauseInSome("attributeValues", "optionId", asArray(entry.value), extraMatch);
      } else if (valueType === "NUMBER") {
        clause = buildRangeInSomeClause("attributeValues", "valueNumber", asRange(entry.value), extraMatch);
      } else if (valueType === "BOOLEAN") {
        clause = buildEqualsTrueInSomeClause("attributeValues", "valueBoolean", extraMatch);
      } else {
        clause = buildContainsInSomeClause("attributeValues", "valueText", asText(entry.value), extraMatch);
      }
      if (clause) and.push(clause as Prisma.ProductWhereInput);
      continue;
    }

    const handler = FIXED_HANDLERS[entry.key];
    if (!handler) continue;
    const clause = handler(entry.value);
    if (clause) and.push(clause as Prisma.ProductWhereInput);
  }

  return and.length > 0 ? { AND: and } : undefined;
}
