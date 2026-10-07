import { ApiError } from "../../lib/ApiError.js";
import { logger } from "../../lib/logger.js";
import type { SlugRedirectEntity } from "../../generated/prisma/index.js";
import { slugRedirectsRepository } from "./slug-redirects.repository.js";

// Called by updateProduct/updateCategory after a slug rename has been
// written: the old slug now redirects to this entity, and the new slug — if
// it was itself somebody's old slug — stops redirecting (it's live again,
// and live pages win anyway; this just keeps the table honest). Best-effort:
// the rename itself already succeeded, so a failure here only costs the
// redirect, never the admin's save.
export async function recordSlugRename(
  entityType: SlugRedirectEntity,
  entityId: number,
  oldSlug: string,
  newSlug: string,
): Promise<void> {
  if (oldSlug === newSlug) return;
  try {
    await slugRedirectsRepository.upsert(entityType, oldSlug, entityId);
    await slugRedirectsRepository.deleteBySlug(entityType, newSlug);
  } catch (err) {
    logger.error({ err, entityType, entityId, oldSlug, newSlug }, "Failed to record slug redirect");
  }
}

// The frontend asks this only after a slug lookup missed (404) — answers
// with the entity's current URL parts if `slug` is one it used to have.
export async function resolveProductSlug(slug: string) {
  const redirect = await slugRedirectsRepository.findEntityId("PRODUCT", slug);
  const target = redirect ? await slugRedirectsRepository.findProductTarget(redirect.entityId) : null;
  if (!target) {
    throw new ApiError(404, "გადამისამართება ვერ მოიძებნა");
  }
  return { slug: target.slug, categorySlug: target.category.slug };
}

export async function resolveCategorySlug(slug: string) {
  const redirect = await slugRedirectsRepository.findEntityId("CATEGORY", slug);
  const target = redirect ? await slugRedirectsRepository.findCategoryTarget(redirect.entityId) : null;
  if (!target) {
    throw new ApiError(404, "გადამისამართება ვერ მოიძებნა");
  }
  return { slug: target.slug };
}
