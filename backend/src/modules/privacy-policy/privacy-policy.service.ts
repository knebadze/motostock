import { cache } from "../../lib/cache.js";
import { isUniqueConstraintViolation } from "../../lib/prismaErrors.js";
import { privacyPolicyRepository } from "./privacy-policy.repository.js";
import type { UpdatePrivacyPolicyInput } from "./privacy-policy.schema.js";

// Read on every public /privacy page load but written only from the admin
// form — read-through cache, same pattern as terms.service.ts/company-info.service.ts.
const PRIVACY_POLICY_CACHE_KEY = "privacy-policy";

type PrivacyPolicyRow = NonNullable<Awaited<ReturnType<typeof privacyPolicyRepository.findFirst>>>;

function toResponse(row: PrivacyPolicyRow) {
  return {
    id: row.id,
    content: { ka: row.contentKa, en: row.contentEn, ru: row.contentRu },
    updatedAt: row.updatedAt,
  };
}

// Singleton bootstrap — creates the one PrivacyPolicy row on first access
// instead of relying on a seed script, since it starts out empty until the
// admin writes real content. The `singleton` column's unique constraint is
// the actual race guard (see CompanyInfo/TermsAndConditions' identical
// pattern); the loser here just re-fetches the winner's row.
async function getOrCreatePrivacyPolicy(): Promise<PrivacyPolicyRow> {
  const existing = await privacyPolicyRepository.findFirst();
  if (existing) return existing;

  try {
    return await privacyPolicyRepository.create();
  } catch (error) {
    if (isUniqueConstraintViolation(error, "singleton")) {
      const row = await privacyPolicyRepository.findFirst();
      if (row) return row;
    }
    throw error;
  }
}

export async function getPrivacyPolicy() {
  const cached = cache.get<ReturnType<typeof toResponse>>(PRIVACY_POLICY_CACHE_KEY);
  if (cached) return cached;

  const response = toResponse(await getOrCreatePrivacyPolicy());
  cache.set(PRIVACY_POLICY_CACHE_KEY, response);
  return response;
}

export async function updatePrivacyPolicy(input: UpdatePrivacyPolicyInput) {
  const existing = await getOrCreatePrivacyPolicy();

  await privacyPolicyRepository.update(existing.id, {
    contentKa: input.content.ka,
    contentEn: input.content.en,
    contentRu: input.content.ru,
  });

  cache.del(PRIVACY_POLICY_CACHE_KEY);
  return getPrivacyPolicy();
}
