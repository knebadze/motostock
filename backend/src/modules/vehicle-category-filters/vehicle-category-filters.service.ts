import { ApiError } from "../../lib/ApiError.js";
import { categoriesRepository } from "../categories/categories.repository.js";
import { resolveCategoryAndAncestorIds, sortByAncestorPriority } from "../attributes/attributes.service.js";
import { listLookupItems } from "../lookups/lookups.service.js";
import { getSpecFieldDefinition } from "./vehicle-spec-fields.registry.js";
import { vehicleCategoryFiltersRepository } from "./vehicle-category-filters.repository.js";
import type { VehicleSpecField } from "../../generated/prisma/index.js";
import type { CreateVehicleCategoryFilterInput } from "./vehicle-category-filters.schema.js";

type NamedRefRow = { id: number; nameKa: string; nameEn: string; nameRu: string; slug: string };

type VehicleCategoryFilterRow = {
  id: number;
  categoryId: number;
  category: NamedRefRow;
  filterType: "PRICE" | "YEAR" | "BRAND" | "SPEC";
  sortOrder: number;
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

export async function createVehicleCategoryFilter(input: CreateVehicleCategoryFilterInput) {
  const category = await categoriesRepository.findById(input.categoryId);
  if (!category) {
    throw new ApiError(400, "მითითებული კატეგორია არ არსებობს");
  }

  if (input.filterType === "SPEC") {
    if (!input.specField) {
      throw new ApiError(400, "SPEC ტიპის ფილტრს სჭირდება specField");
    }

    const existing = await vehicleCategoryFiltersRepository.findByCategoryAndSpecField(
      input.categoryId,
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
      input.categoryId,
      input.filterType,
    );
    if (existing) {
      throw new ApiError(409, `${input.filterType} ფილტრი უკვე დამატებულია ამ კატეგორიისთვის`);
    }
  }

  const row = await vehicleCategoryFiltersRepository.create({
    categoryId: input.categoryId,
    filterType: input.filterType,
    specField: input.filterType === "SPEC" ? (input.specField as VehicleSpecField) : null,
    sortOrder: input.sortOrder ?? 0,
  });
  return toResponse(row);
}

export async function updateVehicleCategoryFilterSortOrder(id: number, sortOrder: number) {
  const existing = await vehicleCategoryFiltersRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ფილტრი ვერ მოიძებნა");
  }

  const row = await vehicleCategoryFiltersRepository.updateSortOrder(id, sortOrder);
  return toResponse(row);
}

export async function deleteVehicleCategoryFilter(id: number) {
  const existing = await vehicleCategoryFiltersRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ფილტრი ვერ მოიძებნა");
  }

  await vehicleCategoryFiltersRepository.delete(id);
}
