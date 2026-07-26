import { ApiError } from "../../lib/ApiError.js";
import { isForeignKeyViolation } from "../../lib/prismaErrors.js";
import { brandsRepository } from "../brands/brands.repository.js";
import { modelsRepository } from "./models.repository.js";
import type { CreateModelInput, UpdateModelInput } from "./models.schema.js";

type ModelRow = {
  id: number;
  brandId: number;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  brand: { id: number; nameKa: string; nameEn: string; nameRu: string; slug: string };
};

function toResponse(model: ModelRow) {
  return {
    id: model.id,
    brandId: model.brandId,
    brand: {
      id: model.brand.id,
      name: { ka: model.brand.nameKa, en: model.brand.nameEn, ru: model.brand.nameRu },
      slug: model.brand.slug,
    },
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

  const existing = await modelsRepository.findByBrandAndSlug(input.brandId, input.slug);
  if (existing) {
    throw new ApiError(409, "ამ მარკაზე ეს slug უკვე გამოყენებულია");
  }

  const model = await modelsRepository.create({
    brandId: input.brandId,
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

  const targetBrandId = input.brandId ?? existing.brandId;
  if (input.slug && (input.slug !== existing.slug || targetBrandId !== existing.brandId)) {
    const bySlug = await modelsRepository.findByBrandAndSlug(targetBrandId, input.slug);
    if (bySlug) {
      throw new ApiError(409, "ამ მარკაზე ეს slug უკვე გამოყენებულია");
    }
  }

  const model = await modelsRepository.update(id, {
    ...(input.brandId !== undefined ? { brandId: input.brandId } : {}),
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
