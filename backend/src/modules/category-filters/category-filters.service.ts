import { ApiError } from "../../lib/ApiError.js";
import { categoriesRepository } from "../categories/categories.repository.js";
import { attributesRepository } from "../attributes/attributes.repository.js";
import { resolveCategoryAndAncestorIds } from "../attributes/attributes.service.js";
import { categoryFiltersRepository } from "./category-filters.repository.js";
import type { CreateCategoryFilterInput } from "./category-filters.schema.js";

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
  filterType: "PRICE" | "BRAND" | "ATTRIBUTE";
  sortOrder: number;
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
  const categoryIds = await resolveCategoryAndAncestorIds(categoryId);
  const rows = await categoryFiltersRepository.findMany(categoryIds);
  return rows.map(toResponse);
}

export async function createCategoryFilter(input: CreateCategoryFilterInput) {
  const category = await categoriesRepository.findById(input.categoryId);
  if (!category) {
    throw new ApiError(400, "მითითებული კატეგორია არ არსებობს");
  }

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
      input.categoryId,
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
      input.categoryId,
      input.filterType,
    );
    if (existing) {
      throw new ApiError(409, `${input.filterType} ფილტრი უკვე დამატებულია ამ კატეგორიისთვის`);
    }
  }

  const row = await categoryFiltersRepository.create({
    categoryId: input.categoryId,
    filterType: input.filterType,
    attributeId: input.filterType === "ATTRIBUTE" ? input.attributeId : null,
    sortOrder: input.sortOrder ?? 0,
  });
  return toResponse(row);
}

export async function updateCategoryFilterSortOrder(id: number, sortOrder: number) {
  const existing = await categoryFiltersRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ფილტრი ვერ მოიძებნა");
  }

  const row = await categoryFiltersRepository.updateSortOrder(id, sortOrder);
  return toResponse(row);
}

export async function deleteCategoryFilter(id: number) {
  const existing = await categoryFiltersRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ფილტრი ვერ მოიძებნა");
  }

  await categoryFiltersRepository.delete(id);
}
