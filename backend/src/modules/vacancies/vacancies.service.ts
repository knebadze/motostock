import { ApiError } from "../../lib/ApiError.js";
import { runUniqueCheckedWrite } from "../../lib/prismaErrors.js";
import { vacanciesRepository } from "./vacancies.repository.js";
import type { CreateVacancyInput, UpdateVacancyInput } from "./vacancies.schema.js";

type VacancyRow = {
  id: number;
  titleKa: string;
  titleEn: string;
  titleRu: string;
  descriptionKa: string;
  descriptionEn: string;
  descriptionRu: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toResponse(row: VacancyRow) {
  return {
    id: row.id,
    title: { ka: row.titleKa, en: row.titleEn, ru: row.titleRu },
    description: { ka: row.descriptionKa, en: row.descriptionEn, ru: row.descriptionRu },
    slug: row.slug,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listVacancies(onlyActive?: boolean) {
  const rows = await vacanciesRepository.findMany(onlyActive);
  return rows.map(toResponse);
}

export async function getVacancy(id: number) {
  const row = await vacanciesRepository.findById(id);
  if (!row) {
    throw new ApiError(404, "ვაკანსია ვერ მოიძებნა");
  }
  return toResponse(row);
}

// Public lookup — an inactive vacancy must 404 exactly like a missing one,
// same "don't leak unpublished content" reasoning as every other public
// by-slug endpoint in this codebase.
export async function getVacancyBySlug(slug: string) {
  const row = await vacanciesRepository.findBySlug(slug);
  if (!row || !row.isActive) {
    throw new ApiError(404, "ვაკანსია ვერ მოიძებნა");
  }
  return toResponse(row);
}

export async function createVacancy(input: CreateVacancyInput) {
  const existing = await vacanciesRepository.findBySlug(input.slug);
  if (existing) {
    throw new ApiError(409, "ეს slug უკვე გამოყენებულია");
  }

  const row = await runUniqueCheckedWrite(
    () =>
      vacanciesRepository.create({
        titleKa: input.title.ka,
        titleEn: input.title.en,
        titleRu: input.title.ru,
        descriptionKa: input.description.ka,
        descriptionEn: input.description.en,
        descriptionRu: input.description.ru,
        slug: input.slug,
        isActive: input.isActive ?? true,
      }),
    "slug",
    "ეს slug უკვე გამოყენებულია",
  );
  return toResponse(row);
}

export async function updateVacancy(id: number, input: UpdateVacancyInput) {
  const existing = await vacanciesRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ვაკანსია ვერ მოიძებნა");
  }

  if (input.slug && input.slug !== existing.slug) {
    const bySlug = await vacanciesRepository.findBySlug(input.slug);
    if (bySlug) {
      throw new ApiError(409, "ეს slug უკვე გამოყენებულია");
    }
  }

  const row = await runUniqueCheckedWrite(
    () =>
      vacanciesRepository.update(id, {
        ...(input.title !== undefined
          ? { titleKa: input.title.ka, titleEn: input.title.en, titleRu: input.title.ru }
          : {}),
        ...(input.description !== undefined
          ? {
              descriptionKa: input.description.ka,
              descriptionEn: input.description.en,
              descriptionRu: input.description.ru,
            }
          : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      }),
    "slug",
    "ეს slug უკვე გამოყენებულია",
  );
  return toResponse(row);
}

export async function deleteVacancy(id: number) {
  const existing = await vacanciesRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ვაკანსია ვერ მოიძებნა");
  }

  await vacanciesRepository.delete(id);
}
