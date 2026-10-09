import { prisma } from "../../config/prisma.js";
import type { SlugRedirectEntity } from "../../generated/prisma/index.js";

export const slugRedirectsRepository = {
  findEntityId(entityType: SlugRedirectEntity, oldSlug: string) {
    return prisma.slugRedirect.findUnique({
      where: { entityType_oldSlug: { entityType, oldSlug } },
      select: { entityId: true },
    });
  },

  // Re-pointed if the same old slug was recorded before (e.g. it once
  // belonged to a different, since-renamed product).
  upsert(entityType: SlugRedirectEntity, oldSlug: string, entityId: number) {
    return prisma.slugRedirect.upsert({
      where: { entityType_oldSlug: { entityType, oldSlug } },
      create: { entityType, oldSlug, entityId },
      update: { entityId },
    });
  },

  deleteBySlug(entityType: SlugRedirectEntity, oldSlug: string) {
    return prisma.slugRedirect.deleteMany({ where: { entityType, oldSlug } });
  },

  findProductTarget(id: number) {
    return prisma.product.findUnique({
      where: { id },
      select: { slug: true, category: { select: { slug: true } } },
    });
  },

  findCategoryTarget(id: number) {
    return prisma.category.findUnique({ where: { id }, select: { slug: true } });
  },
};
