import { ApiError } from "../../lib/ApiError.js";
import { isForeignKeyViolation } from "../../lib/prismaErrors.js";
import { cache } from "../../lib/cache.js";
import { orderStatusesRepository } from "./order-statuses.repository.js";
import type { CreateOrderStatusInput, UpdateOrderStatusItemInput } from "./order-statuses.schema.js";
import type { OrderStatus } from "../../generated/prisma/index.js";

// Read on every checkout/admin-orders page load but written only from the
// new Statuses admin tab — read-through cache, same pattern as
// company-info.service.ts. The old generic lookups.service.ts cached this
// same table under "lookups:order-statuses" before the move to this
// dedicated module; this replaces that entry under its own key.
const ORDER_STATUSES_CACHE_KEY = "order-statuses";

export async function listOrderStatuses() {
  const cached = cache.get<OrderStatus[]>(ORDER_STATUSES_CACHE_KEY);
  if (cached) return cached;

  const items = await orderStatusesRepository.findMany();
  cache.set(ORDER_STATUSES_CACHE_KEY, items);
  return items;
}

export async function createOrderStatus(input: CreateOrderStatusInput) {
  const existing = await orderStatusesRepository.findByKey(input.key);
  if (existing) {
    throw new ApiError(409, "ეს key უკვე გამოყენებულია");
  }

  const maxSortOrder = await orderStatusesRepository.findMaxSortOrder();
  const item = await orderStatusesRepository.create({ ...input, sortOrder: maxSortOrder + 1 });
  cache.del(ORDER_STATUSES_CACHE_KEY);
  return item;
}

export async function updateOrderStatus(id: number, input: UpdateOrderStatusItemInput) {
  const existing = await orderStatusesRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "სტატუსი ვერ მოიძებნა");
  }

  if (input.key && input.key !== existing.key) {
    const byKey = await orderStatusesRepository.findByKey(input.key);
    if (byKey) {
      throw new ApiError(409, "ეს key უკვე გამოყენებულია");
    }
  }

  const item = await orderStatusesRepository.update(id, input);
  cache.del(ORDER_STATUSES_CACHE_KEY);
  return item;
}

export async function deleteOrderStatus(id: number) {
  const existing = await orderStatusesRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "სტატუსი ვერ მოიძებნა");
  }

  try {
    await orderStatusesRepository.delete(id);
    cache.del(ORDER_STATUSES_CACHE_KEY);
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ApiError(400, "ეს სტატუსი გამოიყენება არსებულ შეკვეთებში, ვერ წაიშლება");
    }
    throw error;
  }
}
