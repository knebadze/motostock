import { ApiError } from "../../lib/ApiError.js";
import { isForeignKeyViolation } from "../../lib/prismaErrors.js";
import { getLookupDelegate, type LookupType } from "./lookups.registry.js";
import { lookupsRepository } from "./lookups.repository.js";
import type { CreateLookupItemInput, UpdateLookupItemInput } from "./lookups.schema.js";

export async function listLookupItems(type: LookupType) {
  return lookupsRepository.findMany(getLookupDelegate(type));
}

export async function createLookupItem(type: LookupType, input: CreateLookupItemInput) {
  const delegate = getLookupDelegate(type);
  const existing = await lookupsRepository.findByKey(delegate, input.key);
  if (existing) {
    throw new ApiError(409, "ეს key უკვე გამოყენებულია");
  }
  return lookupsRepository.create(delegate, input);
}

export async function updateLookupItem(
  type: LookupType,
  id: number,
  input: UpdateLookupItemInput,
) {
  const delegate = getLookupDelegate(type);
  const existing = await lookupsRepository.findById(delegate, id);
  if (!existing) {
    throw new ApiError(404, "ჩანაწერი ვერ მოიძებნა");
  }

  if (input.key && input.key !== existing.key) {
    const byKey = await lookupsRepository.findByKey(delegate, input.key);
    if (byKey) {
      throw new ApiError(409, "ეს key უკვე გამოყენებულია");
    }
  }

  return lookupsRepository.update(delegate, id, input);
}

export async function deleteLookupItem(type: LookupType, id: number) {
  const delegate = getLookupDelegate(type);
  const existing = await lookupsRepository.findById(delegate, id);
  if (!existing) {
    throw new ApiError(404, "ჩანაწერი ვერ მოიძებნა");
  }

  try {
    await lookupsRepository.delete(delegate, id);
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ApiError(400, "ეს მნიშვნელობა გამოიყენება არსებულ ჩანაწერებში, ვერ წაიშლება");
    }
    throw error;
  }
}
