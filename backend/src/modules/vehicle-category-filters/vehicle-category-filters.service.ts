import { ApiError } from "../../lib/ApiError.js";
import { cache } from "../../lib/cache.js";
import { runUniqueCheckedWrite } from "../../lib/prismaErrors.js";
import { categoriesRepository } from "../categories/categories.repository.js";
import { resolveCategoryAndAncestorIds, sortByAncestorPriority } from "../attributes/attributes.service.js";
import { listLookupItems } from "../lookups/lookups.service.js";
import { resolveCategoryAndDescendantIds } from "../categories/categories.service.js";
import { vehicleListingRepository } from "../vehicle-listing/vehicle-listing.repository.js";
import { VEHICLE_SPEC_FIELDS, getSpecFieldDefinition } from "./vehicle-spec-fields.registry.js";
import { vehicleCategoryFiltersRepository } from "./vehicle-category-filters.repository.js";
import type { VehicleSpecField } from "../../generated/prisma/index.js";
import { getUsdToGelRate } from "../settings/settings.service.js";
import type { VehicleListingListQuery } from "../vehicle-listing/vehicle-listing.schema.js";
import type {
  CreateVehicleCategoryFilterInput,
  UpdateVehicleCategoryFilterInput,
} from "./vehicle-category-filters.schema.js";

type NamedRefRow = { id: number; nameKa: string; nameEn: string; nameRu: string; slug: string };

type VehicleCategoryFilterRow = {
  id: number;
  categoryId: number;
  category: NamedRefRow;
  filterType: "PRICE" | "YEAR" | "BRAND" | "SPEC";
  sortOrder: number;
  isActive: boolean;
  specField: VehicleSpecField | null;
};

function toNamedRef(row: NamedRefRow) {
  return { id: row.id, name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu }, slug: row.slug };
}

async function toResponse(row: VehicleCategoryFilterRow) {
  if (!row.specField) {
    return {
      id: row.id,
      categoryId: row.categoryId,
      category: toNamedRef(row.category),
      filterType: row.filterType,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      specField: null,
      specFieldLabel: null,
      specFieldKind: null,
      lookupOptions: null,
    };
  }

  const definition = getSpecFieldDefinition(row.specField);
  const lookupOptions =
    definition.kind === "LOOKUP" && definition.lookupType
      ? (await listLookupItems(definition.lookupType)).map((option) => ({
          id: option.id,
          key: option.key,
          label: { ka: option.nameKa, en: option.nameEn, ru: option.nameRu },
        }))
      : null;

  return {
    id: row.id,
    categoryId: row.categoryId,
    category: toNamedRef(row.category),
    filterType: row.filterType,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    specField: row.specField,
    specFieldLabel: { ka: definition.nameKa, en: definition.nameEn, ru: definition.nameRu },
    specFieldKind: definition.kind,
    lookupOptions,
  };
}

export async function listVehicleCategoryFilters(categoryId: number) {
  const categoryIds = await resolveCategoryAndAncestorIds(categoryId);
  const rows = await vehicleCategoryFiltersRepository.findMany(categoryIds);
  return Promise.all(sortByAncestorPriority(rows, categoryIds).map(toResponse));
}

// Specs shown automatically on every vehicle category page (when the
// listings there actually differ in them) — the ones shoppers compare
// bikes by. The rest of VEHICLE_SPEC_FIELDS stay opt-in per category, so
// the sidebar doesn't list all 24.
const AUTOMATIC_SPEC_FIELDS: VehicleSpecField[] = [
  "POWERTRAIN_TYPE",
  "FUEL_TYPE",
  "TRANSMISSION_TYPE",
  "DRIVE_TYPE",
  "ENGINE_VOLUME_CC",
  "ENGINE_POWER_HP",
  "HAS_ABS",
  "IS_CUSTOMS_CLEARED",
  "WEIGHT_KG",
  "SEAT_HEIGHT_MM",
  // Electric vehicles only — the others leave these empty, so they never
  // show there.
  "MOTOR_POWER_WATT",
  "BATTERY_CAPACITY_WH",
  "RANGE_KM",
];

type FacetRow = Awaited<ReturnType<typeof vehicleListingRepository.findSpecFacetRows>>[number];

// One spec's value on one listing (catalog column, or the listing's own
// customs status).
function specValue(row: FacetRow, field: VehicleSpecField): unknown {
  const definition = VEHICLE_SPEC_FIELDS[field];
  const source: Record<string, unknown> =
    definition.table === "VehicleListing" ? row : (row.vehicleCatalog as unknown as Record<string, unknown>);
  return source[definition.column];
}

function numericRange(values: unknown[]) {
  const numbers = values.filter((value) => value != null).map(Number).filter(Number.isFinite);
  return numbers.length > 0 ? { min: Math.min(...numbers), max: Math.max(...numbers) } : null;
}

// The vehicle shop sidebar for one category page — same idea as
// category-filters.service.ts's listStorefrontCategoryFilters: price, year
// and brand always (added up front when not configured); the configured
// filters; then AUTOMATIC_SPEC_FIELDS that aren't configured. A spec is
// only shown when it can actually narrow the list: LOOKUP options no
// listing has are dropped (and a spec needs 2+ left), a NUMBER needs
// different values, a BOOLEAN needs some listings with and some without.
// Inactive config rows are hidden and also suppress their automatic
// version. Built-in/automatic entries get negative ids.
const STOREFRONT_FILTERS_TTL_MS = 5 * 60_000;

// Cached per category for STOREFRONT_FILTERS_TTL_MS: the sidebar's option
// counts and ranges follow every product/listing write across several
// modules, so a short expiry keeps them close enough without wiring
// invalidation into each — while a filter-config change (create / update /
// delete below) drops the cache at once, so an admin sees it immediately.
// The admin "clear cache" button drops it too.
export function listStorefrontVehicleCategoryFilters(categoryId: number) {
  return cache.getOrLoad(`vehicleCategoryFilters:storefront:${categoryId}`, () => computeStorefrontVehicleCategoryFilters(categoryId), STOREFRONT_FILTERS_TTL_MS);
}

function invalidateStorefrontFilters() {
  cache.delPrefix("vehicleCategoryFilters:storefront:");
}

async function computeStorefrontVehicleCategoryFilters(categoryId: number) {
  const category = await categoriesRepository.findById(categoryId);
  if (!category) return [];

  const [configured, subtreeIds] = await Promise.all([
    listVehicleCategoryFilters(categoryId),
    resolveCategoryAndDescendantIds(categoryId),
  ]);
  const rows = await vehicleListingRepository.findSpecFacetRows(subtreeIds);

  type StorefrontFilter = Awaited<ReturnType<typeof toResponse>> & {
    range?: { min: number; max: number } | null;
    trueCount?: number;
  };

  // The filter as the sidebar should show it, or null when it can't narrow
  // anything here.
  function withFacet(filter: StorefrontFilter): StorefrontFilter | null {
    if (filter.filterType === "YEAR") return { ...filter, range: numericRange(rows.map((row) => row.year)) };
    if (filter.filterType !== "SPEC" || !filter.specField) return filter;
    const field = filter.specField;
    const values = rows.map((row) => specValue(row, field));
    if (filter.specFieldKind === "LOOKUP") {
      const counts = new Map<number, number>();
      for (const value of values) {
        if (typeof value === "number") counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      const lookupOptions = (filter.lookupOptions ?? [])
        .filter((option) => counts.has(option.id))
        .map((option) => ({ ...option, count: counts.get(option.id) ?? 0 }));
      return lookupOptions.length >= 2 ? { ...filter, lookupOptions } : null;
    }
    if (filter.specFieldKind === "NUMBER") {
      const range = numericRange(values);
      return range && range.min < range.max ? { ...filter, range } : null;
    }
    if (filter.specFieldKind === "BOOLEAN") {
      const trueCount = values.filter((value) => value === true).length;
      return trueCount > 0 && trueCount < rows.length ? { ...filter, trueCount } : null;
    }
    return filter;
  }

  const categoryRef = {
    id: category.id,
    name: { ka: category.nameKa, en: category.nameEn, ru: category.nameRu },
    slug: category.slug,
  };
  const configuredTypes = new Set(configured.map((filter) => filter.filterType));
  const configuredSpecFields = new Set(configured.map((filter) => filter.specField).filter(Boolean));

  const builtIns = (["PRICE", "YEAR", "BRAND"] as const)
    .filter((filterType) => !configuredTypes.has(filterType))
    .map((filterType, index) => ({
      id: -1 - index,
      categoryId,
      category: categoryRef,
      filterType,
      sortOrder: 0,
      isActive: true,
      specField: null,
      specFieldLabel: null,
      specFieldKind: null,
      lookupOptions: null,
    }));
  const automatic = await Promise.all(
    AUTOMATIC_SPEC_FIELDS.filter((field) => !configuredSpecFields.has(field)).map(async (field) => ({
      ...(await toResponse({
        id: 0,
        categoryId,
        category: { id: category.id, nameKa: category.nameKa, nameEn: category.nameEn, nameRu: category.nameRu, slug: category.slug },
        filterType: "SPEC",
        sortOrder: 0,
        isActive: true,
        specField: field,
      })),
      id: -1000 - AUTOMATIC_SPEC_FIELDS.indexOf(field),
    })),
  );

  return [...builtIns, ...configured.filter((filter) => filter.isActive), ...automatic]
    .map((filter) => withFacet(filter))
    .filter((filter): filter is StorefrontFilter => filter != null)
    .map((filter, index) => ({ ...filter, sortOrder: index }));
}

export async function createVehicleCategoryFilter(input: CreateVehicleCategoryFilterInput) {
  const category = await categoriesRepository.findById(input.categoryId);
  if (!category) {
    throw new ApiError(400, "მითითებული კატეგორია არ არსებობს");
  }

  // Self + every ancestor — see category-filters.service.ts's identical
  // createCategoryFilter for why the duplicate check has to span the whole
  // chain, not just the exact category being written to.
  const categoryIds = await resolveCategoryAndAncestorIds(input.categoryId);

  if (input.filterType === "SPEC") {
    if (!input.specField) {
      throw new ApiError(400, "SPEC ტიპის ფილტრს სჭირდება specField");
    }

    const existing = await vehicleCategoryFiltersRepository.findByCategoryAndSpecField(
      categoryIds,
      input.specField as VehicleSpecField,
    );
    if (existing) {
      throw new ApiError(409, "ეს მახასიათებელი უკვე დამატებულია ამ კატეგორიის ფილტრებში");
    }
  } else {
    if (input.specField != null) {
      throw new ApiError(400, `${input.filterType} ტიპის ფილტრს specField არ სჭირდება`);
    }

    const existing = await vehicleCategoryFiltersRepository.findByCategoryAndType(
      categoryIds,
      input.filterType,
    );
    if (existing) {
      throw new ApiError(409, `${input.filterType} ფილტრი უკვე დამატებულია ამ კატეგორიისთვის`);
    }
  }

  // Same TOCTOU gap as category-filters.service.ts's identical comment — the
  // partial unique indexes backing this (migration
  // 20260914100000_category_filter_config_unique_slots) turn the race's
  // loser into a P2002 instead of a silent duplicate row.
  const row = await runUniqueCheckedWrite(
    () =>
      vehicleCategoryFiltersRepository.create({
        categoryId: input.categoryId,
        filterType: input.filterType,
        specField: input.filterType === "SPEC" ? (input.specField as VehicleSpecField) : null,
      }),
    input.filterType === "SPEC" ? "spec" : "type",
    input.filterType === "SPEC"
      ? "ეს მახასიათებელი უკვე დამატებულია ამ კატეგორიის ფილტრებში"
      : `${input.filterType} ფილტრი უკვე დამატებულია ამ კატეგორიისთვის`,
  );
  invalidateStorefrontFilters();
  return toResponse(row);
}

export async function updateVehicleCategoryFilter(id: number, input: UpdateVehicleCategoryFilterInput) {
  const existing = await vehicleCategoryFiltersRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ფილტრი ვერ მოიძებნა");
  }

  const row = await vehicleCategoryFiltersRepository.update(id, {
    ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  });
  invalidateStorefrontFilters();
  return toResponse(row);
}

export async function deleteVehicleCategoryFilter(id: number) {
  const existing = await vehicleCategoryFiltersRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ფილტრი ვერ მოიძებნა");
  }

  await vehicleCategoryFiltersRepository.delete(id);
  invalidateStorefrontFilters();
}

// Live counts for the vehicle shop sidebar under the shopper's current
// filters (VehicleShopPage refetches them as filters change) — each facet
// counted with every OTHER filter applied but not its own (picking a brand
// still shows what the other brands would add). The listings matching the
// non-facet filters (category, search, price, year) are read once; brand
// and spec filters are then applied in memory per facet — a showroom's
// stock is small, same reasoning as the sidebar itself.
export async function getVehicleFacetCounts(query: VehicleListingListQuery) {
  const categoryIds =
    query.categoryId != null ? await resolveCategoryAndDescendantIds(query.categoryId) : (query.categoryIds ?? []);
  const searchIds = query.search != null ? await vehicleListingRepository.findSearchRankedIds(query.search) : undefined;
  const usdToGelRate = (await getUsdToGelRate()) ?? undefined;
  const rows = await vehicleListingRepository.findSpecFacetRows(categoryIds, {
    searchIds,
    priceMin: query.priceMin,
    priceMax: query.priceMax,
    yearMin: query.yearMin,
    yearMax: query.yearMax,
    bulkDiscountEventId: query.bulkDiscountEventId,
    usdToGelRate,
  });

  const brandIds = query.brandIds ?? [];
  const spec = query.specFilters ?? {};
  type Facet = { kind: "BRAND" } | { kind: "SPEC"; field: VehicleSpecField };
  // Does `row` pass every filter except the one `skip` names?
  function passes(row: FacetRow, skip: Facet) {
    if (skip.kind !== "BRAND" && brandIds.length > 0 && !brandIds.includes(row.vehicleCatalog.brandId)) return false;
    const skipField = skip.kind === "SPEC" ? skip.field : null;
    for (const filter of spec.lookupFilters ?? []) {
      if (filter.field === skipField) continue;
      if (!filter.ids.includes(specValue(row, filter.field) as number)) return false;
    }
    for (const range of spec.numberRanges ?? []) {
      if (range.field === skipField) continue;
      const value = specValue(row, range.field);
      if (value == null) return false;
      const number = Number(value);
      if ((range.min != null && number < range.min) || (range.max != null && number > range.max)) return false;
    }
    for (const field of spec.booleanFields ?? []) {
      if (field === skipField) continue;
      if (specValue(row, field) !== true) return false;
    }
    return true;
  }

  const brandCounts = new Map<number, number>();
  for (const row of rows) {
    if (!passes(row, { kind: "BRAND" })) continue;
    brandCounts.set(row.vehicleCatalog.brandId, (brandCounts.get(row.vehicleCatalog.brandId) ?? 0) + 1);
  }

  const options: { field: VehicleSpecField; optionId: number; count: number }[] = [];
  const booleans: { field: VehicleSpecField; count: number }[] = [];
  for (const field of Object.keys(VEHICLE_SPEC_FIELDS) as VehicleSpecField[]) {
    const kind = getSpecFieldDefinition(field).kind;
    if (kind !== "LOOKUP" && kind !== "BOOLEAN") continue;
    const matching = rows.filter((row) => passes(row, { kind: "SPEC", field }));
    if (kind === "LOOKUP") {
      const counts = new Map<number, number>();
      for (const row of matching) {
        const value = specValue(row, field);
        if (typeof value === "number") counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      for (const [optionId, count] of counts) options.push({ field, optionId, count });
    } else {
      booleans.push({ field, count: matching.filter((row) => specValue(row, field) === true).length });
    }
  }

  return {
    brands: [...brandCounts].map(([id, count]) => ({ id, count })),
    options,
    booleans,
  };
}
