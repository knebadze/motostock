import { ApiError } from "../../lib/ApiError.js";
import { cache } from "../../lib/cache.js";
import { runUniqueCheckedWrite } from "../../lib/prismaErrors.js";
import { categoriesRepository } from "../categories/categories.repository.js";
import { attributesRepository } from "../attributes/attributes.repository.js";
import {
  resolveAttributeCategoryIds,
  resolveCategoryAndAncestorIds,
  sortByAncestorPriority,
} from "../attributes/attributes.service.js";
import {
  getVehicleFitmentDisabledCategoryIds,
  resolveCategoryAndDescendantIds,
} from "../categories/categories.service.js";
import { productsRepository } from "../products/products.repository.js";
import { categoryFiltersRepository } from "./category-filters.repository.js";
import type { CreateCategoryFilterInput, UpdateCategoryFilterInput } from "./category-filters.schema.js";

type OptionRow = { id: number; key: string; labelKa: string; labelEn: string; labelRu: string };
type NamedRefRow = { id: number; nameKa: string; nameEn: string; nameRu: string; slug: string };

type AttributeRefRow = {
  id: number;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  valueType: string;
  options: OptionRow[];
} | null;

type CategoryFilterRow = {
  id: number;
  categoryId: number;
  category: NamedRefRow;
  filterType: "PRICE" | "BRAND" | "ATTRIBUTE" | "MY_VEHICLE";
  sortOrder: number;
  isActive: boolean;
  attribute: AttributeRefRow;
};

function toNamedRef(row: NamedRefRow) {
  return { id: row.id, name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu }, slug: row.slug };
}

function toResponse(row: CategoryFilterRow) {
  return {
    id: row.id,
    categoryId: row.categoryId,
    // The row's own defining category — differs from the browsed/managed
    // category when this filter was inherited from a parent.
    category: toNamedRef(row.category),
    filterType: row.filterType,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    attribute: row.attribute
      ? {
          id: row.attribute.id,
          name: { ka: row.attribute.nameKa, en: row.attribute.nameEn, ru: row.attribute.nameRu },
          valueType: row.attribute.valueType,
          options: row.attribute.options.map((option) => ({
            id: option.id,
            key: option.key,
            label: { ka: option.labelKa, en: option.labelEn, ru: option.labelRu },
          })),
        }
      : null,
  };
}

export async function listCategoryFilters(categoryId: number) {
  const [categoryIds, attributeCategoryIds] = await Promise.all([
    resolveCategoryAndAncestorIds(categoryId),
    resolveAttributeCategoryIds(categoryId),
  ]);
  // PRICE/BRAND/MY_VEHICLE filters inherit through the whole chain;
  // attribute filters only from categories whose attributes still apply
  // here (see Category.inheritsAttributes).
  const rows = (await categoryFiltersRepository.findMany(categoryIds)).filter(
    (row) => row.filterType !== "ATTRIBUTE" || attributeCategoryIds.includes(row.categoryId),
  );
  return sortByAncestorPriority(rows, categoryIds).map(toResponse);
}

type UnitAbbreviationRow = { abbreviationKa: string; abbreviationEn: string; abbreviationRu: string } | null;

function toUnitAbbreviation(unit: UnitAbbreviationRow) {
  return unit ? { ka: unit.abbreviationKa, en: unit.abbreviationEn, ru: unit.abbreviationRu } : null;
}

// The shop filter sidebar for one category page: the admin-configured
// filters (listCategoryFilters) completed from the data itself —
// - price and brand always, "my vehicle" wherever vehicle fitment applies
//   (added up front when not configured; dropped where fitment is off);
// - every SELECT/NUMBER/BOOLEAN attribute that applies to this category AND
//   is actually used by a visible product under it, after the configured
//   ones (most specific category first). A subcategory's own attributes
//   appear once the shopper is on that subcategory, so a root page doesn't
//   list every attribute of the whole branch;
// - options no product here holds are dropped (an attribute left with none
//   disappears), each remaining option carries its product count, and
//   number attributes carry the min/max actually present.
// Built-in/automatic entries get negative ids (they have no config row).
// An inactive config row hides its filter — including the automatic one.
const STOREFRONT_FILTERS_TTL_MS = 5 * 60_000;

// Cached per category for STOREFRONT_FILTERS_TTL_MS: the sidebar's option
// counts and ranges follow every product/listing write across several
// modules, so a short expiry keeps them close enough without wiring
// invalidation into each — while a filter-config change (create / update /
// delete below) drops the cache at once, so an admin sees it immediately.
// The admin "clear cache" button drops it too.
export function listStorefrontCategoryFilters(categoryId: number) {
  return cache.getOrLoad(`categoryFilters:storefront:${categoryId}`, () => computeStorefrontCategoryFilters(categoryId), STOREFRONT_FILTERS_TTL_MS);
}

function invalidateStorefrontFilters() {
  cache.delPrefix("categoryFilters:storefront:");
}

async function computeStorefrontCategoryFilters(categoryId: number) {
  const category = await categoriesRepository.findById(categoryId);
  if (!category) return [];

  const [configured, attributeCategoryIds, subtreeIds, fitmentOff] = await Promise.all([
    listCategoryFilters(categoryId),
    resolveAttributeCategoryIds(categoryId),
    resolveCategoryAndDescendantIds(categoryId),
    getVehicleFitmentDisabledCategoryIds(),
  ]);
  const facetRows = await productsRepository.findAttributeValueFacets(subtreeIds);

  type Facet = { optionCounts: Map<number, number>; trueCount: number; min: number | null; max: number | null };
  const facets = new Map<number, Facet>();
  for (const row of facetRows) {
    const facet = facets.get(row.attributeId) ?? { optionCounts: new Map(), trueCount: 0, min: null, max: null };
    if (row.optionId != null) {
      facet.optionCounts.set(row.optionId, (facet.optionCounts.get(row.optionId) ?? 0) + row._count._all);
    }
    if (row.valueBoolean === true) facet.trueCount += row._count._all;
    const min = row._min.valueNumber != null ? Number(row._min.valueNumber) : null;
    const max = row._max.valueNumber != null ? Number(row._max.valueNumber) : null;
    if (min != null) facet.min = facet.min == null ? min : Math.min(facet.min, min);
    if (max != null) facet.max = facet.max == null ? max : Math.max(facet.max, max);
    facets.set(row.attributeId, facet);
  }

  type StorefrontAttribute = NonNullable<ReturnType<typeof toResponse>["attribute"]>;
  // The attribute as the sidebar should show it, or null when no product
  // here gives it a usable value.
  function withFacet(
    attribute: StorefrontAttribute,
    unit: UnitAbbreviationRow,
  ) {
    const facet = facets.get(attribute.id);
    if (!facet) return null;
    if (attribute.valueType === "SELECT") {
      const options = attribute.options
        .filter((option) => facet.optionCounts.has(option.id))
        .map((option) => ({ ...option, count: facet.optionCounts.get(option.id) ?? 0 }));
      return options.length > 0 ? { ...attribute, options, unit: null, range: null } : null;
    }
    if (attribute.valueType === "BOOLEAN") {
      return facet.trueCount > 0 ? { ...attribute, unit: null, range: null, trueCount: facet.trueCount } : null;
    }
    if (attribute.valueType === "NUMBER") {
      return facet.min != null && facet.max != null
        ? { ...attribute, unit: toUnitAbbreviation(unit), range: { min: facet.min, max: facet.max } }
        : null;
    }
    return null;
  }

  const fitmentEnabled = !fitmentOff.has(categoryId);
  const categoryRef = {
    id: category.id,
    name: { ka: category.nameKa, en: category.nameEn, ru: category.nameRu },
    slug: category.slug,
  };
  function builtIn(id: number, filterType: "PRICE" | "BRAND" | "MY_VEHICLE") {
    return { id, categoryId, category: categoryRef, filterType, sortOrder: 0, isActive: true, attribute: null };
  }

  const configuredTypes = new Set(configured.map((filter) => filter.filterType));
  const leading = [
    ...(fitmentEnabled && !configuredTypes.has("MY_VEHICLE") ? [builtIn(-1, "MY_VEHICLE")] : []),
    ...(!configuredTypes.has("PRICE") ? [builtIn(-2, "PRICE")] : []),
    ...(!configuredTypes.has("BRAND") ? [builtIn(-3, "BRAND")] : []),
  ];

  const configuredAttributeIds = configured
    .map((filter) => filter.attribute?.id)
    .filter((id): id is number => id != null);
  const configuredUnits = new Map(
    (await categoryFiltersRepository.findUnitsByAttributeIds(configuredAttributeIds)).map((row) => [row.id, row.unit]),
  );
  // Inactive rows count as "configured" above (so their automatic version
  // stays hidden) but aren't shown themselves.
  const shownConfigured = configured.flatMap((filter) => {
    if (!filter.isActive) return [];
    if (filter.filterType === "MY_VEHICLE" && !fitmentEnabled) return [];
    if (!filter.attribute) return [filter];
    const attribute = withFacet(filter.attribute, configuredUnits.get(filter.attribute.id) ?? null);
    return attribute ? [{ ...filter, attribute }] : [];
  });

  // Automatic: applicable, used, not already configured. Most specific
  // category first (the browsed one, then up the tree), then seed order.
  const depthByCategoryId = new Map(attributeCategoryIds.map((id, index) => [id, index]));
  const autoCandidates = (
    await categoryFiltersRepository.findFilterableAttributes(
      [...facets.keys()].filter((id) => !configuredAttributeIds.includes(id)),
    )
  )
    .filter((row) => depthByCategoryId.has(row.categoryId))
    .sort((a, b) => depthByCategoryId.get(a.categoryId)! - depthByCategoryId.get(b.categoryId)! || a.id - b.id);
  const automatic = autoCandidates.flatMap((row) => {
    const attribute = withFacet(
      {
        id: row.id,
        name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu },
        valueType: row.valueType,
        options: row.options.map((option) => ({
          id: option.id,
          key: option.key,
          label: { ka: option.labelKa, en: option.labelEn, ru: option.labelRu },
        })),
      },
      row.unit,
    );
    return attribute
      ? [
          {
            id: -1000 - row.id,
            categoryId,
            category: categoryRef,
            filterType: "ATTRIBUTE" as const,
            sortOrder: 0,
            isActive: true,
            attribute,
          },
        ]
      : [];
  });

  return [...leading, ...shownConfigured, ...automatic].map((filter, index) => ({ ...filter, sortOrder: index }));
}

export async function createCategoryFilter(input: CreateCategoryFilterInput) {
  const category = await categoriesRepository.findById(input.categoryId);
  if (!category) {
    throw new ApiError(400, "მითითებული კატეგორია არ არსებობს");
  }

  // Self + every ancestor — a filter set on a parent already applies here
  // via inheritance (see listCategoryFilters/findMany), so a duplicate
  // check scoped to only the exact categoryId would let a direct API call
  // add a redundant filter that's already inherited from a parent, even
  // though the admin UI's own "available options" list already prevents
  // this in normal use.
  const categoryIds = await resolveCategoryAndAncestorIds(input.categoryId);

  if (input.filterType === "ATTRIBUTE") {
    if (!input.attributeId) {
      throw new ApiError(400, "ATTRIBUTE ტიპის ფილტრს სჭირდება attributeId");
    }

    const attribute = await attributesRepository.findById(input.attributeId);
    if (!attribute) {
      throw new ApiError(400, "მითითებული მახასიათებელი არ არსებობს");
    }
    if (attribute.valueType === "TEXT") {
      throw new ApiError(400, "თავისუფალი ტექსტის მახასიათებელი ვერ გახდება ფილტრი");
    }

    const existing = await categoryFiltersRepository.findByCategoryAndAttribute(
      categoryIds,
      input.attributeId,
    );
    if (existing) {
      throw new ApiError(409, "ეს მახასიათებელი უკვე დამატებულია ამ კატეგორიის ფილტრებში");
    }
  } else {
    if (input.attributeId != null) {
      throw new ApiError(400, `${input.filterType} ტიპის ფილტრს attributeId არ სჭირდება`);
    }

    const existing = await categoryFiltersRepository.findByCategoryAndType(
      categoryIds,
      input.filterType,
    );
    if (existing) {
      throw new ApiError(409, `${input.filterType} ფილტრი უკვე დამატებულია ამ კატეგორიისთვის`);
    }
  }

  // The pre-checks above only catch the non-race case — a double-click (or
  // two admins) can both pass them before either commits. The partial
  // unique indexes backing this (migration
  // 20260914100000_category_filter_config_unique_slots) turn the race's
  // loser into a P2002 instead of a silent duplicate row; this maps it back
  // to the same clean 409 the pre-check already gives everyone else.
  const row = await runUniqueCheckedWrite(
    () =>
      categoryFiltersRepository.create({
        categoryId: input.categoryId,
        filterType: input.filterType,
        attributeId: input.filterType === "ATTRIBUTE" ? input.attributeId : null,
      }),
    input.filterType === "ATTRIBUTE" ? "attribute" : "type",
    input.filterType === "ATTRIBUTE"
      ? "ეს მახასიათებელი უკვე დამატებულია ამ კატეგორიის ფილტრებში"
      : `${input.filterType} ფილტრი უკვე დამატებულია ამ კატეგორიისთვის`,
  );
  invalidateStorefrontFilters();
  return toResponse(row);
}

export async function updateCategoryFilter(id: number, input: UpdateCategoryFilterInput) {
  const existing = await categoryFiltersRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ფილტრი ვერ მოიძებნა");
  }

  const row = await categoryFiltersRepository.update(id, {
    ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  });
  invalidateStorefrontFilters();
  return toResponse(row);
}

export async function deleteCategoryFilter(id: number) {
  const existing = await categoryFiltersRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ფილტრი ვერ მოიძებნა");
  }

  await categoryFiltersRepository.delete(id);
  invalidateStorefrontFilters();
}
