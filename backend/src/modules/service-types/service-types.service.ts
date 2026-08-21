import { ApiError } from "../../lib/ApiError.js";
import { isForeignKeyViolation } from "../../lib/prismaErrors.js";
import { serviceTypesRepository } from "./service-types.repository.js";
import type {
  CreateServiceTypeInput,
  ReorderServiceTypesInput,
  UpdateServiceTypeInput,
} from "./service-types.schema.js";

type ServiceTypeRow = {
  id: number;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  hasPositionOption: boolean;
  hasFilterOption: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

function toResponse(row: ServiceTypeRow) {
  return {
    id: row.id,
    name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu },
    hasPositionOption: row.hasPositionOption,
    hasFilterOption: row.hasFilterOption,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listServiceTypes(onlyActive?: boolean) {
  const rows = await serviceTypesRepository.findMany(onlyActive);
  return rows.map(toResponse);
}

export async function getServiceType(id: number) {
  const row = await serviceTypesRepository.findById(id);
  if (!row) {
    throw new ApiError(404, "სერვისის ტიპი ვერ მოიძებნა");
  }
  return toResponse(row);
}

export async function createServiceType(input: CreateServiceTypeInput) {
  const row = await serviceTypesRepository.create({
    nameKa: input.name.ka,
    nameEn: input.name.en,
    nameRu: input.name.ru,
    hasPositionOption: input.hasPositionOption ?? false,
    hasFilterOption: input.hasFilterOption ?? false,
    isActive: input.isActive ?? true,
  });
  return toResponse(row);
}

export async function updateServiceType(id: number, input: UpdateServiceTypeInput) {
  const existing = await serviceTypesRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "სერვისის ტიპი ვერ მოიძებნა");
  }

  const row = await serviceTypesRepository.update(id, {
    ...(input.name !== undefined
      ? { nameKa: input.name.ka, nameEn: input.name.en, nameRu: input.name.ru }
      : {}),
    ...(input.hasPositionOption !== undefined ? { hasPositionOption: input.hasPositionOption } : {}),
    ...(input.hasFilterOption !== undefined ? { hasFilterOption: input.hasFilterOption } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  });
  return toResponse(row);
}

export async function reorderServiceTypes(input: ReorderServiceTypesInput) {
  const existing = await serviceTypesRepository.findMany();
  const existingIds = new Set(existing.map((row) => row.id));

  if (input.ids.length !== existing.length || !input.ids.every((id) => existingIds.has(id))) {
    throw new ApiError(400, "მითითებული სერვისების სია არ ემთხვევა არსებულს");
  }

  await serviceTypesRepository.reorder(input.ids);
  return listServiceTypes();
}

export async function deleteServiceType(id: number) {
  const existing = await serviceTypesRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "სერვისის ტიპი ვერ მოიძებნა");
  }

  try {
    await serviceTypesRepository.delete(id);
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ApiError(
        400,
        "ამ სერვისის ტიპით უკვე დაფიქსირებულია ისტორია — წაშლის ნაცვლად გამორთეთ (isActive)",
      );
    }
    throw error;
  }
}
