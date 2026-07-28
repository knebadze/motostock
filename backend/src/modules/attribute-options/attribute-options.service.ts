import { ApiError } from "../../lib/ApiError.js";
import { isForeignKeyViolation } from "../../lib/prismaErrors.js";
import { attributesRepository } from "../attributes/attributes.repository.js";
import { attributeOptionsRepository } from "./attribute-options.repository.js";
import type {
  CreateAttributeOptionInput,
  UpdateAttributeOptionInput,
} from "./attribute-options.schema.js";

type AttributeOptionRow = {
  id: number;
  attributeId: number;
  key: string;
  labelKa: string;
  labelEn: string;
  labelRu: string;
};

function toResponse(row: AttributeOptionRow) {
  return {
    id: row.id,
    attributeId: row.attributeId,
    key: row.key,
    label: { ka: row.labelKa, en: row.labelEn, ru: row.labelRu },
  };
}

async function assertAttributeExists(attributeId: number) {
  const attribute = await attributesRepository.findById(attributeId);
  if (!attribute) {
    throw new ApiError(404, "მახასიათებელი ვერ მოიძებნა");
  }
}

export async function listAttributeOptions(attributeId: number) {
  await assertAttributeExists(attributeId);
  const rows = await attributeOptionsRepository.findMany(attributeId);
  return rows.map(toResponse);
}

export async function createAttributeOption(
  attributeId: number,
  input: CreateAttributeOptionInput,
) {
  await assertAttributeExists(attributeId);

  const existing = await attributeOptionsRepository.findByAttributeAndKey(attributeId, input.key);
  if (existing) {
    throw new ApiError(409, "ეს key უკვე გამოყენებულია ამ მახასიათებელზე");
  }

  const row = await attributeOptionsRepository.create({
    attributeId,
    key: input.key,
    labelKa: input.label.ka,
    labelEn: input.label.en,
    labelRu: input.label.ru,
  });
  return toResponse(row);
}

export async function updateAttributeOption(
  attributeId: number,
  id: number,
  input: UpdateAttributeOptionInput,
) {
  const existing = await attributeOptionsRepository.findById(id);
  if (!existing || existing.attributeId !== attributeId) {
    throw new ApiError(404, "მნიშვნელობა ვერ მოიძებნა");
  }

  if (input.key && input.key !== existing.key) {
    const byKey = await attributeOptionsRepository.findByAttributeAndKey(attributeId, input.key);
    if (byKey) {
      throw new ApiError(409, "ეს key უკვე გამოყენებულია ამ მახასიათებელზე");
    }
  }

  const row = await attributeOptionsRepository.update(id, {
    ...(input.key !== undefined ? { key: input.key } : {}),
    ...(input.label !== undefined
      ? { labelKa: input.label.ka, labelEn: input.label.en, labelRu: input.label.ru }
      : {}),
  });
  return toResponse(row);
}

export async function deleteAttributeOption(attributeId: number, id: number) {
  const existing = await attributeOptionsRepository.findById(id);
  if (!existing || existing.attributeId !== attributeId) {
    throw new ApiError(404, "მნიშვნელობა ვერ მოიძებნა");
  }

  try {
    await attributeOptionsRepository.delete(id);
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ApiError(
        400,
        "ეს მნიშვნელობა გამოიყენება პროდუქტებში, ჯერ წაშალეთ დამოკიდებული მონაცემები",
      );
    }
    throw error;
  }
}
