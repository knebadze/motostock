import { ApiError } from "../../lib/ApiError.js";
import { isForeignKeyViolation } from "../../lib/prismaErrors.js";
import { deleteUploadedImage, saveUploadedImage } from "../../lib/storage.js";
import { applyCategoryAdminFilters } from "../filters/category/category-filter-registry.js";
import { categoriesRepository } from "./categories.repository.js";
import type {
  CategoryListQuery,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./categories.schema.js";

type CategoryRow = {
  id: number;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  slug: string;
  imageUrl: string | null;
  bannerImageUrl: string | null;
  sortOrder: number;
  lowStockBadgeEnabled: boolean;
  parentId: number | null;
  createdAt: Date;
  updatedAt: Date;
  parent?: { id: number; nameKa: string; nameEn: string; nameRu: string } | null;
};

function toResponse(category: CategoryRow) {
  return {
    id: category.id,
    name: { ka: category.nameKa, en: category.nameEn, ru: category.nameRu },
    slug: category.slug,
    imageUrl: category.imageUrl,
    bannerImageUrl: category.bannerImageUrl,
    sortOrder: category.sortOrder,
    lowStockBadgeEnabled: category.lowStockBadgeEnabled,
    parentId: category.parentId,
    parent: category.parent
      ? {
          id: category.parent.id,
          name: {
            ka: category.parent.nameKa,
            en: category.parent.nameEn,
            ru: category.parent.nameRu,
          },
        }
      : null,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

async function assertNoCycle(categoryId: number, proposedParentId: number) {
  if (proposedParentId === categoryId) {
    throw new ApiError(400, "კატეგორია საკუთარი თავის მშობელი ვერ იქნება");
  }

  let currentId: number | null = proposedParentId;
  while (currentId !== null) {
    if (currentId === categoryId) {
      throw new ApiError(400, "მშობელი ვერ იქნება საკუთარი შვილობილი კატეგორია");
    }
    const current = await categoriesRepository.findById(currentId);
    currentId = current?.parentId ?? null;
  }
}

async function assertParentExists(parentId: number) {
  const parent = await categoriesRepository.findById(parentId);
  if (!parent) {
    throw new ApiError(400, "მითითებული მშობელი კატეგორია არ არსებობს");
  }
}

export async function listCategories(query: CategoryListQuery = {}) {
  const where = applyCategoryAdminFilters(query.adminFilters);
  const categories = await categoriesRepository.findMany(where);
  return categories.map(toResponse);
}

// Resolves categoryId + every descendant category id (opposite direction from
// the parent-walking used by assertNoCycle above). Products and vehicle
// listings are only ever seeded on leaf categories, so browsing a parent
// category (e.g. "transport") must still surface items from its children.
// One findMany() call builds a parentId -> children[] map in memory, then a
// single BFS from categoryId — no per-level DB round trips.
export async function resolveCategoryAndDescendantIds(categoryId: number): Promise<number[]> {
  const allCategories = await categoriesRepository.findMany();
  const childrenByParentId = new Map<number, number[]>();
  for (const category of allCategories) {
    if (category.parentId == null) continue;
    const siblings = childrenByParentId.get(category.parentId) ?? [];
    siblings.push(category.id);
    childrenByParentId.set(category.parentId, siblings);
  }

  const result: number[] = [];
  const queue = [categoryId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);
    queue.push(...(childrenByParentId.get(current) ?? []));
  }
  return result;
}

export async function getCategory(id: number) {
  const category = await categoriesRepository.findById(id);
  if (!category) {
    throw new ApiError(404, "კატეგორია ვერ მოიძებნა");
  }
  return toResponse(category);
}

export async function createCategory(input: CreateCategoryInput) {
  const existing = await categoriesRepository.findBySlug(input.slug);
  if (existing) {
    throw new ApiError(409, "ეს slug უკვე გამოყენებულია");
  }

  if (input.parentId != null) {
    await assertParentExists(input.parentId);
  }

  const category = await categoriesRepository.create({
    nameKa: input.name.ka,
    nameEn: input.name.en,
    nameRu: input.name.ru,
    slug: input.slug,
    parentId: input.parentId ?? null,
    sortOrder: input.sortOrder ?? 0,
    ...(input.lowStockBadgeEnabled !== undefined
      ? { lowStockBadgeEnabled: input.lowStockBadgeEnabled }
      : {}),
  });

  return toResponse(category);
}

export async function updateCategory(id: number, input: UpdateCategoryInput) {
  const existing = await categoriesRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "კატეგორია ვერ მოიძებნა");
  }

  if (input.slug && input.slug !== existing.slug) {
    const bySlug = await categoriesRepository.findBySlug(input.slug);
    if (bySlug) {
      throw new ApiError(409, "ეს slug უკვე გამოყენებულია");
    }
  }

  if (input.parentId !== undefined && input.parentId !== null) {
    await assertParentExists(input.parentId);
    await assertNoCycle(id, input.parentId);
  }

  const category = await categoriesRepository.update(id, {
    ...(input.name !== undefined
      ? { nameKa: input.name.ka, nameEn: input.name.en, nameRu: input.name.ru }
      : {}),
    ...(input.slug !== undefined ? { slug: input.slug } : {}),
    ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
    ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    ...(input.lowStockBadgeEnabled !== undefined
      ? { lowStockBadgeEnabled: input.lowStockBadgeEnabled }
      : {}),
  });

  return toResponse(category);
}

export async function deleteCategory(id: number) {
  const existing = await categoriesRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "კატეგორია ვერ მოიძებნა");
  }

  const childrenCount = await categoriesRepository.countChildren(id);
  if (childrenCount > 0) {
    throw new ApiError(400, "ჯერ წაშალეთ ან გადაანაცვლეთ შვილობილი კატეგორიები");
  }

  try {
    await categoriesRepository.delete(id);
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ApiError(
        400,
        "კატეგორია გამოიყენება მოდელებში ან ტექნიკის კატალოგში, ჯერ წაშალეთ დამოკიდებული ჩანაწერები",
      );
    }
    throw error;
  }
  void deleteUploadedImage(existing.imageUrl);
  void deleteUploadedImage(existing.bannerImageUrl);
}

export async function setCategoryImage(id: number, file: Express.Multer.File) {
  const existing = await categoriesRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "კატეგორია ვერ მოიძებნა");
  }

  const imageUrl = await saveUploadedImage("categories", file);
  const category = await categoriesRepository.updateImage(id, imageUrl);
  void deleteUploadedImage(existing.imageUrl);
  return toResponse(category);
}

export async function setCategoryBannerImage(id: number, file: Express.Multer.File) {
  const existing = await categoriesRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "კატეგორია ვერ მოიძებნა");
  }

  const bannerImageUrl = await saveUploadedImage("categories-banner", file);
  const category = await categoriesRepository.updateBannerImage(id, bannerImageUrl);
  void deleteUploadedImage(existing.bannerImageUrl);
  return toResponse(category);
}
