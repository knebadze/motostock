import { ApiError } from "../../lib/ApiError.js";
import { isForeignKeyViolation } from "../../lib/prismaErrors.js";
import { unitsRepository } from "./units.repository.js";
import type { CreateUnitInput, UpdateUnitInput } from "./units.schema.js";

type UnitRow = {
  id: number;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  abbreviationKa: string;
  abbreviationEn: string;
  abbreviationRu: string;
  createdAt: Date;
  updatedAt: Date;
};

function toResponse(row: UnitRow) {
  return {
    id: row.id,
    name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu },
    abbreviation: { ka: row.abbreviationKa, en: row.abbreviationEn, ru: row.abbreviationRu },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listUnits() {
  const rows = await unitsRepository.findMany();
  return rows.map(toResponse);
}

export async function getUnit(id: number) {
  const row = await unitsRepository.findById(id);
  if (!row) {
    throw new ApiError(404, "ერთეული ვერ მოიძებნა");
  }
  return toResponse(row);
}

export async function createUnit(input: CreateUnitInput) {
  const row = await unitsRepository.create({
    nameKa: input.name.ka,
    nameEn: input.name.en,
    nameRu: input.name.ru,
    abbreviationKa: input.abbreviation.ka,
    abbreviationEn: input.abbreviation.en,
    abbreviationRu: input.abbreviation.ru,
  });
  return toResponse(row);
}

export async function updateUnit(id: number, input: UpdateUnitInput) {
  const existing = await unitsRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ერთეული ვერ მოიძებნა");
  }

  const row = await unitsRepository.update(id, {
    ...(input.name !== undefined
      ? { nameKa: input.name.ka, nameEn: input.name.en, nameRu: input.name.ru }
      : {}),
    ...(input.abbreviation !== undefined
      ? {
          abbreviationKa: input.abbreviation.ka,
          abbreviationEn: input.abbreviation.en,
          abbreviationRu: input.abbreviation.ru,
        }
      : {}),
  });
  return toResponse(row);
}

export async function deleteUnit(id: number) {
  const existing = await unitsRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ერთეული ვერ მოიძებნა");
  }

  try {
    await unitsRepository.delete(id);
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ApiError(400, "ერთეული გამოიყენება მახასიათებლებში, ჯერ წაშალეთ დამოკიდებული ჩანაწერები");
    }
    throw error;
  }
}
