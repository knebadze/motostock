import { cache } from "../../lib/cache.js";
import { termsRepository } from "./terms.repository.js";
import type { UpdateTermsInput } from "./terms.schema.js";

// Read on every public /terms page load but written only from the admin
// form — read-through cache, same pattern as company-info.service.ts.
const TERMS_CACHE_KEY = "terms-and-conditions";

type TermsRow = NonNullable<Awaited<ReturnType<typeof termsRepository.findFirst>>>;

function toResponse(row: TermsRow) {
  return {
    id: row.id,
    content: { ka: row.contentKa, en: row.contentEn, ru: row.contentRu },
    updatedAt: row.updatedAt,
  };
}

// Singleton bootstrap — creates the one TermsAndConditions row on first
// access instead of relying on a seed script, since it starts out empty
// until the admin writes real content.
async function getOrCreateTerms(): Promise<TermsRow> {
  const existing = await termsRepository.findFirst();
  if (existing) return existing;
  return termsRepository.create();
}

export async function getTerms() {
  const cached = cache.get<ReturnType<typeof toResponse>>(TERMS_CACHE_KEY);
  if (cached) return cached;

  const response = toResponse(await getOrCreateTerms());
  cache.set(TERMS_CACHE_KEY, response);
  return response;
}

export async function updateTerms(input: UpdateTermsInput) {
  const existing = await getOrCreateTerms();

  await termsRepository.update(existing.id, {
    contentKa: input.content.ka,
    contentEn: input.content.en,
    contentRu: input.content.ru,
  });

  cache.del(TERMS_CACHE_KEY);
  return getTerms();
}
