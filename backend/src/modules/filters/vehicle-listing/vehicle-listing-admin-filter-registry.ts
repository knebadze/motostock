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

// Spec fields live on VehicleCatalog, one hop away from VehicleListing —
// same registry as the shop's SPEC filters and vehicle-catalog's admin
// filters, just nested under "vehicleCatalog" here.
const SPEC_HANDLERS: Record<string, Handler> = Object.fromEntries(
  Object.entries(VEHICLE_SPEC_FIELDS).map(([key, definition]) => {
    const path = ["vehicleCatalog", definition.column];
    if (definition.kind === "LOOKUP") {
      return [key, (value: unknown) => buildInClause(path, asArray(value))];
    }
    if (definition.kind === "NUMBER") {
      return [key, (value: unknown) => buildRangeClause(path, asRange(value))];
    }
    return [key, () => buildEqualsTrueClause(path)];
  }),
);

const FIXED_HANDLERS: Record<string, Handler> = {
  ID: (value) => buildInClause(["id"], asArray(value)),
  SEARCH: (value) =>
    buildContainsAnyClause(
      [
        ["vehicleCatalog", "brand", "nameKa"],
        ["vehicleCatalog", "brand", "nameEn"],
        ["vehicleCatalog", "brand", "nameRu"],
        ["vehicleCatalog", "model", "nameKa"],
        ["vehicleCatalog", "model", "nameEn"],
        ["vehicleCatalog", "model", "nameRu"],
      ],
      asText(value),
    ),
  PRICE: (value) => buildRangeClause(["price"], asRange(value)),
  YEAR: (value) => buildRangeClause(["year"], asRange(value)),
  BRAND: (value) => buildInClause(["vehicleCatalog", "brandId"], asArray(value)),
  MODEL: (value) => buildInClause(["vehicleCatalog", "modelId"], asArray(value)),
  CATEGORY: (value) => buildInClause(["vehicleCatalog", "model", "categoryId"], asArray(value)),
  CONDITION: (value) => buildInClause(["conditionId"], asArray(value)),
  STATUS: (value) => buildInClause(["statusId"], asArray(value)),
  COLOR: (value) => buildInClause(["colorId"], asArray(value)),
  STOCK_QUANTITY: (value) => buildRangeClause(["stockQuantity"], asRange(value)),
  IS_ACTIVE: () => buildEqualsTrueClause(["isActive"]),
  CREATED_AT: (value) => buildRangeClause(["createdAt"], asRange(value)),
  UPDATED_AT: (value) => buildRangeClause(["updatedAt"], asRange(value)),
};

const HANDLERS: Record<string, Handler> = { ...SPEC_HANDLERS, ...FIXED_HANDLERS };

export function applyVehicleListingAdminFilters(
  entries: FilterEntry[] | undefined,
): Prisma.VehicleListingWhereInput | undefined {
  if (!entries || entries.length === 0) return undefined;

  const and: Prisma.VehicleListingWhereInput[] = [];
  for (const entry of entries) {
    const handler = HANDLERS[entry.key];
    if (!handler) continue;
    const clause = handler(entry.value);
    if (clause) and.push(clause as Prisma.VehicleListingWhereInput);
  }

  return and.length > 0 ? { AND: and } : undefined;
}
