import { ApiError } from "../../lib/ApiError.js";
import { isForeignKeyViolation } from "../../lib/prismaErrors.js";
import { categoriesRepository } from "../categories/categories.repository.js";
import { unitsRepository } from "../units/units.repository.js";
import { attributesRepository } from "./attributes.repository.js";
import type {
  AttributeValueTypeInput,
  CreateAttributeInput,
  UpdateAttributeInput,
} from "./attributes.schema.js";

type NamedRefRow = { id: number; nameKa: string; nameEn: string; nameRu: string; slug: string };
type UnitRefRow = {
  id: number;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  abbreviationKa: string;
  abbreviationEn: string;
  abbreviationRu: string;
};

type AttributeRow = {
  id: number;
  category: NamedRefRow;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  valueType: AttributeValueTypeInput;
  required: boolean;
  unit: UnitRefRow | null;
  createdAt: Date;
  updatedAt: Date;
};

function toNamedRef(row: NamedRefRow) {
  return { id: row.id, name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu }, slug: row.slug };
}

function toUnitRef(row: UnitRefRow) {
  return {
    id: row.id,
    name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu },
    abbreviation: { ka: row.abbreviationKa, en: row.abbreviationEn, ru: row.abbreviationRu },
  };
}

function toResponse(row: AttributeRow) {
  return {
    id: row.id,
    category: toNamedRef(row.category),
    name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu },
    valueType: row.valueType,
    required: row.required,
    unit: row.unit ? toUnitRef(row.unit) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Walks parentId up to the root and returns [categoryId, ...ancestorIds] — the
// same category-tree traversal categories.service.ts already does for cycle
// detection, reused here so an attribute defined on a parent category (e.g.
// "მასალა" on "ეკიპირება") is inherited by every descendant category.
export async function resolveCategoryAndAncestorIds(categoryId: number): Promise<number[]> {
  const ids: number[] = [];
  let currentId: number | null = categoryId;
  while (currentId !== null) {
    ids.push(currentId);
    const current = await categoriesRepository.findById(currentId);
    currentId = current?.parentId ?? null;
  }
  return ids;
}

// Shared by category-filters and vehicle-category-filters — both list
// filters across [categoryId, ...ancestorIds] (as returned by
// resolveCategoryAndAncestorIds, ordered leaf-first/root-last) and want
// ancestor-defined (parent) filters to take priority over the browsed
// category's own, so broader/shared filters (set once high in the tree)
// consistently appear before more specific ones. Ties within the same
// category still resolve by the admin-configured sortOrder.
export function sortByAncestorPriority<T extends { categoryId: number; sortOrder: number }>(
  rows: T[],
  categoryIds: number[],
): T[] {
  const depthByCategoryId = new Map(categoryIds.map((id, index) => [id, index]));
  return [...rows].sort((a, b) => {
    const depthDiff =
      (depthByCategoryId.get(b.categoryId) ?? 0) - (depthByCategoryId.get(a.categoryId) ?? 0);
    return depthDiff !== 0 ? depthDiff : a.sortOrder - b.sortOrder;
  });
}

async function assertCategoryExists(categoryId: number) {
  const category = await categoriesRepository.findById(categoryId);
  if (!category) {
    throw new ApiError(400, "მითითებული კატეგორია არ არსებობს");
  }
}

async function assertUnitExists(unitId: number) {
  const unit = await unitsRepository.findById(unitId);
  if (!unit) {
    throw new ApiError(400, "მითითებული ერთეული არ არსებობს");
  }
}

export async function listAttributes(categoryId?: number) {
  const categoryIds = categoryId != null ? await resolveCategoryAndAncestorIds(categoryId) : undefined;
  const rows = await attributesRepository.findMany(categoryIds);
  return rows.map(toResponse);
}

export async function getAttribute(id: number) {
  const row = await attributesRepository.findById(id);
  if (!row) {
    throw new ApiError(404, "მახასიათებელი ვერ მოიძებნა");
  }
  return toResponse(row);
}

export async function createAttribute(input: CreateAttributeInput) {
  await assertCategoryExists(input.categoryId);
  if (input.unitId != null) {
    await assertUnitExists(input.unitId);
  }

  const row = await attributesRepository.create({
    categoryId: input.categoryId,
    nameKa: input.name.ka,
    nameEn: input.name.en,
    nameRu: input.name.ru,
    valueType: input.valueType,
    required: input.required ?? false,
    unitId: input.unitId ?? null,
  });
  return toResponse(row);
}

export async function updateAttribute(id: number, input: UpdateAttributeInput) {
  const existing = await attributesRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "მახასიათებელი ვერ მოიძებნა");
  }

  // Category is fixed after creation — the same policy products.service.ts's
  // updateProduct applies to a Product's own categoryId, for the mirror-image
  // reason: existing ProductAttributeValue rows were validated (and, for
  // required attributes, entered) against this attribute's *current*
  // category. Moving the attribute to a different category would silently
  // orphan every value already stored under the old category (dropped the
  // next time any of those products is saved, since buildAttributeValueWriteData
  // filters by applicability) and retroactively leave every existing product
  // already in the new category missing a value for a requirement it never
  // had a chance to fill in. An admin who needs this attribute somewhere else
  // creates a new one there instead.
  if (input.categoryId !== undefined && input.categoryId !== existing.category.id) {
    throw new ApiError(
      400,
      "მახასიათებლის კატეგორიის შეცვლა შეუძლებელია — საჭიროების შემთხვევაში შექმენით ახალი მახასიათებელი სწორი კატეგორიით",
      "ATTRIBUTE_CATEGORY_CHANGE_NOT_ALLOWED",
    );
  }
  if (input.unitId != null) {
    await assertUnitExists(input.unitId);
  }

  const row = await attributesRepository.update(id, {
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    ...(input.name !== undefined
      ? { nameKa: input.name.ka, nameEn: input.name.en, nameRu: input.name.ru }
      : {}),
    ...(input.valueType !== undefined ? { valueType: input.valueType } : {}),
    ...(input.required !== undefined ? { required: input.required } : {}),
    ...(input.unitId !== undefined ? { unitId: input.unitId } : {}),
  });
  return toResponse(row);
}

export async function deleteAttribute(id: number) {
  const existing = await attributesRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "მახასიათებელი ვერ მოიძებნა");
  }

  try {
    await attributesRepository.delete(id);
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ApiError(
        400,
        "მახასიათებელი გამოიყენება პროდუქტებში, ჯერ წაშალეთ დამოკიდებული მონაცემები",
      );
    }
    throw error;
  }
}
