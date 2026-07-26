import { ApiError } from "../../lib/ApiError.js";
import { isForeignKeyViolation } from "../../lib/prismaErrors.js";
import { brandsRepository } from "../brands/brands.repository.js";
import { categoriesRepository } from "../categories/categories.repository.js";
import { modelsRepository } from "./models.repository.js";
import type { CreateModelInput, UpdateModelInput } from "./models.schema.js";

type NamedRefRow = { id: number; nameKa: string; nameEn: string; nameRu: string; slug: string };

type ModelRow = {
  id: number;
  brandId: number;
  categoryId: number | null;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  brand: NamedRefRow;
  category: NamedRefRow | null;
};

function toNamedRef(row: NamedRefRow) {
  return { id: row.id, name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu }, slug: row.slug };
}

function toResponse(model: ModelRow) {
  return {
    id: model.id,
    brandId: model.brandId,
    brand: toNamedRef(model.brand),
    categoryId: model.categoryId,
    category: model.category ? toNamedRef(model.category) : null,
    name: { ka: model.nameKa, en: model.nameEn, ru: model.nameRu },
    slug: model.slug,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
}

async function assertBrandExists(brandId: number) {
  const brand = await brandsRepository.findById(brandId);
  if (!brand) {
    throw new ApiError(400, "მითითებული მარკა არ არსებობს");
  }
}

async function assertCategoryExists(categoryId: number | null | undefined) {
  if (categoryId == null) return;
  const category = await categoriesRepository.findById(categoryId);
  if (!category) {
    throw new ApiError(400, "მითითებული ტიპი (კატეგორია) არ არსებობს");
  }
}

export async function listModels(brandId?: number) {
  const models = await modelsRepository.findMany(brandId);
  return models.map(toResponse);
}

export async function getModel(id: number) {
  const model = await modelsRepository.findById(id);
  if (!model) {
    throw new ApiError(404, "მოდელი ვერ მოიძებნა");
  }
  return toResponse(model);
}

export async function createModel(input: CreateModelInput) {
  await assertBrandExists(input.brandId);
  await assertCategoryExists(input.categoryId);

  const existing = await modelsRepository.findByBrandAndSlug(input.brandId, input.slug);
  if (existing) {
    throw new ApiError(409, "ამ მარკაზე ეს slug უკვე გამოყენებულია");
  }

  const model = await modelsRepository.create({
    brandId: input.brandId,
    categoryId: input.categoryId ?? null,
    nameKa: input.name.ka,
    nameEn: input.name.en,
    nameRu: input.name.ru,
    slug: input.slug,
  });
  return toResponse(model);
}

export async function updateModel(id: number, input: UpdateModelInput) {
  const existing = await modelsRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "მოდელი ვერ მოიძებნა");
  }

  if (input.brandId !== undefined) {
    await assertBrandExists(input.brandId);
  }
  if (input.categoryId !== undefined) {
    await assertCategoryExists(input.categoryId);
  }

  const targetBrandId = input.brandId ?? existing.brandId;
  if (input.slug && (input.slug !== existing.slug || targetBrandId !== existing.brandId)) {
    const bySlug = await modelsRepository.findByBrandAndSlug(targetBrandId, input.slug);
    if (bySlug) {
      throw new ApiError(409, "ამ მარკაზე ეს slug უკვე გამოყენებულია");
    }
  }

  const model = await modelsRepository.update(id, {
    ...(input.brandId !== undefined ? { brandId: input.brandId } : {}),
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    ...(input.name !== undefined
      ? { nameKa: input.name.ka, nameEn: input.name.en, nameRu: input.name.ru }
      : {}),
    ...(input.slug !== undefined ? { slug: input.slug } : {}),
  });
  return toResponse(model);
}

export async function deleteModel(id: number) {
  const existing = await modelsRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "მოდელი ვერ მოიძებნა");
  }

  try {
    await modelsRepository.delete(id);
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ApiError(
        400,
        "მოდელი გამოიყენება ტექნიკის კატალოგში, ჯერ წაშალეთ დამოკიდებული ჩანაწერები",
      );
    }
    throw error;
  }
}
