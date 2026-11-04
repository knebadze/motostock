import { prisma } from "../../config/prisma.js";
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

// One shared read while the cache is empty — a category page calls several
// tree walks in parallel, which would otherwise each load the table on a
// cold cache.
let inFlight: Promise<CategoryTreeNode[]> | null = null;

export async function getCategoryTree(): Promise<CategoryTreeNode[]> {
  const cached = cache.get<CategoryTreeNode[]>(CATEGORY_TREE_CACHE_KEY);
  if (cached) return cached;
  if (inFlight) return inFlight;
  const load = prisma.category
    .findMany({
      select: {
        id: true,
        parentId: true,
        inheritsAttributes: true,
        sizeScaleId: true,
        onlinePurchaseEnabled: true,
        vehicleFitmentEnabled: true,
      },
    })
    .then((tree) => {
      // Not stored if a write invalidated the tree while this read ran.
      if (inFlight === load) cache.set(CATEGORY_TREE_CACHE_KEY, tree);
      return tree;
    })
    .finally(() => {
      if (inFlight === load) inFlight = null;
    });
  inFlight = load;
  return load;
}

export function invalidateCategoryTree() {
  cache.del(CATEGORY_TREE_CACHE_KEY);
  inFlight = null;
}
