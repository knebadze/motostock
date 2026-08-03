import type { Prisma } from "../../../generated/prisma/index.js";
import { VEHICLE_SPEC_FIELDS } from "../../vehicle-category-filters/vehicle-spec-fields.registry.js";
import type { FilterEntry } from "../filter-request.schema.js";
import {
  buildContainsAnyClause,
  buildEqualsTrueClause,
  buildInClause,
  buildRangeClause,
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

// Every VEHICLE_SPEC_FIELDS key maps 1:1 onto a VehicleCatalog column — this
// IS the table those specs live on, so the same registry that drives the
// shop's SPEC filter widgets also drives this admin registry, at the root
// path (no "vehicleCatalog." prefix needed, unlike vehicle-listing's).
const SPEC_HANDLERS: Record<string, Handler> = Object.fromEntries(
  Object.entries(VEHICLE_SPEC_FIELDS).map(([key, definition]) => {
    if (definition.kind === "LOOKUP") {
      return [key, (value: unknown) => buildInClause([definition.column], asArray(value))];
    }
    if (definition.kind === "NUMBER") {
      return [key, (value: unknown) => buildRangeClause([definition.column], asRange(value))];
    }
    return [key, () => buildEqualsTrueClause([definition.column])];
  }),
);

const FIXED_HANDLERS: Record<string, Handler> = {
  BRAND: (value) => buildInClause(["brandId"], asArray(value)),
  MODEL: (value) => buildInClause(["modelId"], asArray(value)),
  CATEGORY: (value) => buildInClause(["model", "categoryId"], asArray(value)),
  VARIANT: (value) => buildContainsAnyClause([["variant"]], asText(value)),
  YEAR_FROM: (value) => buildRangeClause(["yearFrom"], asRange(value)),
  YEAR_TO: (value) => buildRangeClause(["yearTo"], asRange(value)),
  CREATED_AT: (value) => buildRangeClause(["createdAt"], asRange(value)),
  UPDATED_AT: (value) => buildRangeClause(["updatedAt"], asRange(value)),
};

const HANDLERS: Record<string, Handler> = { ...SPEC_HANDLERS, ...FIXED_HANDLERS };

export function applyVehicleCatalogAdminFilters(
  entries: FilterEntry[] | undefined,
): Prisma.VehicleCatalogWhereInput | undefined {
  if (!entries || entries.length === 0) return undefined;

  const and: Prisma.VehicleCatalogWhereInput[] = [];
  for (const entry of entries) {
    const handler = HANDLERS[entry.key];
    if (!handler) continue;
    const clause = handler(entry.value);
    if (clause) and.push(clause as Prisma.VehicleCatalogWhereInput);
  }

  return and.length > 0 ? { AND: and } : undefined;
}
