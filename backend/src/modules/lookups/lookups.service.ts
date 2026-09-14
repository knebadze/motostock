import { ApiError } from "../../lib/ApiError.js";
import { isForeignKeyViolation, isUniqueConstraintViolation } from "../../lib/prismaErrors.js";
import { cache } from "../../lib/cache.js";
import { getLookupDelegate, type LookupRecord, type LookupType } from "./lookups.registry.js";
import { lookupsRepository } from "./lookups.repository.js";
import type { CreateLookupItemInput, UpdateLookupItemInput } from "./lookups.schema.js";

function cacheKey(type: LookupType) {
  return `lookups:${type}`;
}

// Only "listing-statuses" has any reserved keys today — orders.service.ts's
// resolveSoldStatusId/resolveAvailableStatusId resolve SOLD/AVAILABLE by
// this exact key, so renaming or deleting either would silently break
// order placement/cancellation's stock-status flips instead of failing
// loudly at the point of misuse. Every other LookupType (colors, cities,
// cancellation-reasons, etc.) is free-form — nothing in the codebase
// resolves those by a specific hard-coded key.
const RESERVED_KEYS: Partial<Record<LookupType, readonly string[]>> = {
  "listing-statuses": ["SOLD", "AVAILABLE"],
};

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

  let item;
  try {
    item = await lookupsRepository.create(delegate, input);
  } catch (error) {
    // Closes the gap between the findByKey check above and this create — a
    // double-click, or two admins creating the same key at once, can both
    // pass that check before either commits (same class of race as
    // company-info.service.ts's getOrCreateCompanyInfo). Without this, the
    // loser hit a raw, uncaught P2002 and got a 500 instead of the same
    // clean 409 the pre-check gives the non-race case.
    if (isUniqueConstraintViolation(error, "key")) {
      throw new ApiError(409, "ეს key უკვე გამოყენებულია");
    }
    throw error;
  }
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
    if (RESERVED_KEYS[type]?.includes(existing.key)) {
      throw new ApiError(400, "სისტემური მნიშვნელობის key-ის შეცვლა შეუძლებელია", "LOOKUP_KEY_RESERVED");
    }
    const byKey = await lookupsRepository.findByKey(delegate, input.key);
    if (byKey) {
      throw new ApiError(409, "ეს key უკვე გამოყენებულია");
    }
  }

  let item;
  try {
    item = await lookupsRepository.update(delegate, id, input);
  } catch (error) {
    // Same race as createLookupItem above, closed the same way.
    if (isUniqueConstraintViolation(error, "key")) {
      throw new ApiError(409, "ეს key უკვე გამოყენებულია");
    }
    throw error;
  }
  cache.del(cacheKey(type));
  return item;
}

export async function deleteLookupItem(type: LookupType, id: number) {
  const delegate = getLookupDelegate(type);
  const existing = await lookupsRepository.findById(delegate, id);
  if (!existing) {
    throw new ApiError(404, "ჩანაწერი ვერ მოიძებნა");
  }

  if (RESERVED_KEYS[type]?.includes(existing.key)) {
    throw new ApiError(400, "სისტემური მნიშვნელობის წაშლა შეუძლებელია", "LOOKUP_DELETE_RESERVED");
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
