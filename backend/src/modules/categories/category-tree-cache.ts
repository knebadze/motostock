import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/index.js";
import { cache } from "../../lib/cache.js";

// The category tree's structure — just what the tree walks need (parent
// links and the inherited switches), not names or images. Every storefront
// category page walks it several times per request (ancestors, descendants,
// attribute inheritance, size scale, purchase/fitment switches), so it's
// cached with no expiry: categories only change through categories.service
// (create/update/delete each call invalidateCategoryTree) or a seed / direct
// DB edit, after which the admin "clear cache" button (cache.clear()) drops
// it too. Kept in its own module so attributes.service etc. can read it
// without importing categories.service.
export type CategoryTreeNode = {
  id: number;
  parentId: number | null;
  inheritsAttributes: boolean;
  sizeScaleId: number | null;
  onlinePurchaseEnabled: boolean;
  vehicleFitmentEnabled: boolean;
};

const CATEGORY_TREE_CACHE_KEY = "categories:tree";

// Straight from the DB, bypassing the cache — for a write that must plan
// against the tree as it really is (inside its own transaction), not a
// possibly stale cached copy (e.g. after a seed or a direct SQL edit).
export function loadCategoryTree(db: typeof prisma | Prisma.TransactionClient = prisma): Promise<CategoryTreeNode[]> {
  return db.category.findMany({
    select: {
      id: true,
      parentId: true,
      inheritsAttributes: true,
      sizeScaleId: true,
      onlinePurchaseEnabled: true,
      vehicleFitmentEnabled: true,
    },
  });
}

// cache.getOrLoad shares one read between concurrent misses (a category
// page runs several tree walks in parallel) and never stores a read that a
// write — or the "clear cache" button — invalidated while it ran.
export function getCategoryTree(): Promise<CategoryTreeNode[]> {
  return cache.getOrLoad(CATEGORY_TREE_CACHE_KEY, () => loadCategoryTree());
}

export function invalidateCategoryTree() {
  cache.del(CATEGORY_TREE_CACHE_KEY);
}
