import { cache } from "../../lib/cache.js";
import { isUniqueConstraintViolation } from "../../lib/prismaErrors.js";
import { shippingPolicyRepository } from "./shipping-policy.repository.js";
import type { UpdateShippingPolicyInput } from "./shipping-policy.schema.js";

// Read on every public /privacy page load but written only from the admin
// form — read-through cache, same pattern as terms.service.ts/company-info.service.ts.
const SHIPPING_POLICY_CACHE_KEY = "shipping-policy";

type ShippingPolicyRow = NonNullable<Awaited<ReturnType<typeof shippingPolicyRepository.findFirst>>>;

function toResponse(row: ShippingPolicyRow) {
  return {
    id: row.id,
    content: { ka: row.contentKa, en: row.contentEn, ru: row.contentRu },
    updatedAt: row.updatedAt,
  };
}

// Singleton bootstrap — creates the one ShippingPolicy row on first access
// instead of relying on a seed script, since it starts out empty until the
// admin writes real content. The `singleton` column's unique constraint is
// the actual race guard (see CompanyInfo/TermsAndConditions' identical
// pattern); the loser here just re-fetches the winner's row.
async function getOrCreateShippingPolicy(): Promise<ShippingPolicyRow> {
  const existing = await shippingPolicyRepository.findFirst();
  if (existing) return existing;

  try {
    return await shippingPolicyRepository.create();
  } catch (error) {
    if (isUniqueConstraintViolation(error, "singleton")) {
      const row = await shippingPolicyRepository.findFirst();
      if (row) return row;
    }
    throw error;
  }
}

export async function getShippingPolicy() {
  const cached = cache.get<ReturnType<typeof toResponse>>(SHIPPING_POLICY_CACHE_KEY);
  if (cached) return cached;

  const response = toResponse(await getOrCreateShippingPolicy());
  cache.set(SHIPPING_POLICY_CACHE_KEY, response);
  return response;
}

export async function updateShippingPolicy(input: UpdateShippingPolicyInput) {
  const existing = await getOrCreateShippingPolicy();

  await shippingPolicyRepository.update(existing.id, {
    contentKa: input.content.ka,
    contentEn: input.content.en,
    contentRu: input.content.ru,
  });

  cache.del(SHIPPING_POLICY_CACHE_KEY);
  return getShippingPolicy();
}
