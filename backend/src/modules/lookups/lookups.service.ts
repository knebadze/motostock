import { ApiError } from "../../lib/ApiError.js";
import { isForeignKeyViolation } from "../../lib/prismaErrors.js";
import { cache } from "../../lib/cache.js";
import { getLookupDelegate, type LookupRecord, type LookupType } from "./lookups.registry.js";
import { lookupsRepository } from "./lookups.repository.js";
import type { CreateLookupItemInput, UpdateLookupItemInput } from "./lookups.schema.js";

function cacheKey(type: LookupType) {
  return `lookups:${type}`;
}

export async function listLookupItems(type: LookupType) {
  const key = cacheKey(type);
  const cached = cache.get<LookupRecord[]>(key);
  if (cached) return cached;

  const items = await lookupsRepository.findMany(getLookupDelegate(type));
  cache.set(key, items);
  return items;
}

export async function createLookupItem(type: LookupType, input: CreateLookupItemInput) {
  const delegate = getLookupDelegate(type);
  const existing = await lookupsRepository.findByKey(delegate, input.key);
  if (existing) {
    throw new ApiError(409, "ეს key უკვე გამოყენებულია");
  }
  const item = await lookupsRepository.create(delegate, input);
  cache.del(cacheKey(type));
  return item;
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

  const item = await lookupsRepository.update(delegate, id, input);
  cache.del(cacheKey(type));
  return item;
}

export async function deleteLookupItem(type: LookupType, id: number) {
  const delegate = getLookupDelegate(type);
  const existing = await lookupsRepository.findById(delegate, id);
  if (!existing) {
    throw new ApiError(404, "ჩანაწერი ვერ მოიძებნა");
  }

  try {
    await lookupsRepository.delete(delegate, id);
    cache.del(cacheKey(type));
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ApiError(400, "ეს მნიშვნელობა გამოიყენება არსებულ ჩანაწერებში, ვერ წაიშლება");
    }
    throw error;
  }
}
