import { ApiError } from "../../lib/ApiError.js";
import { isForeignKeyViolation } from "../../lib/prismaErrors.js";
import { categoriesRepository } from "../categories/categories.repository.js";
import { attributesRepository } from "./attributes.repository.js";
import type {
  AttributeValueTypeInput,
  CreateAttributeInput,
  UpdateAttributeInput,
} from "./attributes.schema.js";

type NamedRefRow = { id: number; nameKa: string; nameEn: string; nameRu: string; slug: string };

type AttributeRow = {
  id: number;
  category: NamedRefRow;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  valueType: AttributeValueTypeInput;
  required: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toNamedRef(row: NamedRefRow) {
  return { id: row.id, name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu }, slug: row.slug };
}

function toResponse(row: AttributeRow) {
  return {
    id: row.id,
    category: toNamedRef(row.category),
    name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu },
    valueType: row.valueType,
    required: row.required,
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

  const row = await attributesRepository.create({
    categoryId: input.categoryId,
    nameKa: input.name.ka,
    nameEn: input.name.en,
    nameRu: input.name.ru,
    valueType: input.valueType,
    required: input.required ?? false,
  });
  return toResponse(row);
}

export async function updateAttribute(id: number, input: UpdateAttributeInput) {
  const existing = await attributesRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "მახასიათებელი ვერ მოიძებნა");
  }

  if (input.categoryId !== undefined) {
    await assertCategoryExists(input.categoryId);
  }

  const row = await attributesRepository.update(id, {
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    ...(input.name !== undefined
      ? { nameKa: input.name.ka, nameEn: input.name.en, nameRu: input.name.ru }
      : {}),
    ...(input.valueType !== undefined ? { valueType: input.valueType } : {}),
    ...(input.required !== undefined ? { required: input.required } : {}),
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
