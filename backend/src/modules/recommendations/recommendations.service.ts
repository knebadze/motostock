import { ApiError } from "../../lib/ApiError.js";
import { productsRepository } from "../products/products.repository.js";
import { toResponse as toProductResponse, buildVehicleCompatibilityWhere } from "../products/products.service.js";
import { productFitmentRepository } from "../product-fitment/product-fitment.repository.js";
import { productViewsRepository } from "../product-views/product-views.repository.js";
import { recommendationsRepository } from "./recommendations.repository.js";
import type { Prisma } from "../../generated/prisma/index.js";

const DEFAULT_LIMIT = 10;

// Re-orders a findByIds/findManyRaw result (which doesn't preserve `in`
// array order) back into a ranked id list's order — same pattern
// products.service.ts's listPopularProducts already uses.
function reorderByIds<T extends { id: number }>(rows: T[], ids: number[]): T[] {
  const rowById = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => rowById.get(id)).filter((row): row is T => row != null);
}

async function assertProductExists(productId: number) {
  const product = await productsRepository.findById(productId);
  if (!product) {
    throw new ApiError(404, "პროდუქტი ვერ მოიძებნა");
  }
  return product;
}

// "Similar products" — same category as the anchor, optionally narrowed to
// ones compatible with the shopper's selected vehicle, ranked by how many
// vehicles they explicitly share fitment with (a soft similarity signal —
// see product-fitment.repository.ts's findOverlapCounts for why it's
// explicit-fitment-only rather than the full rule-aware compatibility set).
export async function listSimilarProducts(
  productId: number,
  options: { vehicleCatalogId?: number; limit?: number },
) {
  const anchor = await assertProductExists(productId);
  const limit = options.limit ?? DEFAULT_LIMIT;
  const poolSize = Math.min(100, limit * 5);

  const vehicleCompatibilityWhere = options.vehicleCatalogId
    ? await buildVehicleCompatibilityWhere(options.vehicleCatalogId)
    : undefined;

  const candidates = await productsRepository.findMany({
    categoryIds: [anchor.categoryId],
    excludeProductId: productId,
    vehicleCompatibilityWhere,
    limit: poolSize,
  });
  if (candidates.length === 0) return [];

  const anchorFitments = await productFitmentRepository.findMany(productId);
  const anchorVehicleIds = anchorFitments.map((fitment) => fitment.vehicleCatalog.id);
  const overlapCounts =
    anchorVehicleIds.length > 0
      ? await productFitmentRepository.findOverlapCounts(
          candidates.map((candidate) => candidate.id),
          anchorVehicleIds,
        )
      : new Map<number, number>();

  const ranked = [...candidates].sort(
    (a, b) => (overlapCounts.get(b.id) ?? 0) - (overlapCounts.get(a.id) ?? 0),
  );

  return ranked.slice(0, limit).map(toProductResponse);
}

// Algorithmic "frequently bought together" — co-purchase counts from
// products.repository.ts's findCoOccurringProductIds, optionally narrowed to
// vehicle-compatible companions. Independent of the admin-curated
// ProductBuyTogether table (see BuyTogether.tsx on the frontend); this is
// meant as a fallback shown when the admin hasn't curated anything for a
// given product.
export async function listFrequentlyBoughtTogether(
  productId: number,
  options: { vehicleCatalogId?: number; limit?: number },
) {
  await assertProductExists(productId);
  const limit = options.limit ?? DEFAULT_LIMIT;
  const poolSize = Math.min(100, limit * 5);

  const coOccurringIds = await productsRepository.findCoOccurringProductIds(productId, poolSize);
  if (coOccurringIds.length === 0) return [];

  let rankedIds = coOccurringIds;
  if (options.vehicleCatalogId != null) {
    const where = await buildVehicleCompatibilityWhere(options.vehicleCatalogId);
    const matching = await productsRepository.findIdsMatchingWhere(coOccurringIds, where);
    const allowedIds = new Set(matching.map((row) => row.id));
    rankedIds = coOccurringIds.filter((id) => allowedIds.has(id));
  }

  const finalIds = rankedIds.slice(0, limit);
  if (finalIds.length === 0) return [];

  const rows = await productsRepository.findByIds(finalIds);
  return reorderByIds(rows, finalIds).map(toProductResponse);
}

// "Customers who viewed this also viewed" — view-based co-occurrence
// (product-views.repository.ts's findCoViewedProductIds), same shape as
// listFrequentlyBoughtTogether but from browsing behavior instead of
// completed purchases. A much higher-volume signal (views vastly outnumber
// orders), so it's useful even early on when order history is thin.
export async function listViewedTogether(
  productId: number,
  options: { vehicleCatalogId?: number; limit?: number },
) {
  await assertProductExists(productId);
  const limit = options.limit ?? DEFAULT_LIMIT;
  const poolSize = Math.min(100, limit * 5);

  const coViewedIds = await productViewsRepository.findCoViewedProductIds(productId, poolSize);
  if (coViewedIds.length === 0) return [];

  let rankedIds = coViewedIds;
  if (options.vehicleCatalogId != null) {
    const where = await buildVehicleCompatibilityWhere(options.vehicleCatalogId);
    const matching = await productsRepository.findIdsMatchingWhere(coViewedIds, where);
    const allowedIds = new Set(matching.map((row) => row.id));
    rankedIds = coViewedIds.filter((id) => allowedIds.has(id));
  }

  const finalIds = rankedIds.slice(0, limit);
  if (finalIds.length === 0) return [];

  const rows = await productsRepository.findByIds(finalIds);
  return reorderByIds(rows, finalIds).map(toProductResponse);
}

// "Popular for your vehicle" — same order-quantity ranking as the homepage
// POPULAR_PRODUCTS section, restricted to products compatible with one
// vehicle (the shopper's SELECTED_VEHICLE_COOKIE pick).
export async function listPopularForVehicle(vehicleCatalogId: number, limit = DEFAULT_LIMIT) {
  const vehicleWhere = await buildVehicleCompatibilityWhere(vehicleCatalogId);
  const rankedIds = await productsRepository.findPopularProductIds(limit, { productWhere: vehicleWhere });
  if (rankedIds.length === 0) return [];

  const rows = await productsRepository.findByIds(rankedIds);
  return reorderByIds(rows, rankedIds).map(toProductResponse);
}

const ORDER_AFFINITY_WEIGHT = 2;
const WISHLIST_AFFINITY_WEIGHT = 1;

type AffinityRow = { categoryId: number; productBrandId: number | null } | null | undefined;

function addAffinity(
  categoryScores: Map<number, number>,
  brandScores: Map<number, number>,
  product: AffinityRow,
  weight: number,
) {
  if (!product) return;
  categoryScores.set(product.categoryId, (categoryScores.get(product.categoryId) ?? 0) + weight);
  if (product.productBrandId != null) {
    brandScores.set(product.productBrandId, (brandScores.get(product.productBrandId) ?? 0) + weight);
  }
}

const VIEW_AFFINITY_WEIGHT = 0.5;

// "Recommended for you" — content-based, per-user. Tries the best signal
// available and falls back gracefully:
//   1. category/brand affinity from the user's own orders + wishlist +
//      product views (weighted by how strong a signal of intent each one
//      is — a purchase outweighs a wishlist save, which outweighs just
//      viewing a page), further narrowed to their garage vehicles'
//      compatible set if they have any;
//   2. no affinity yet but they do have a garage vehicle -> just the
//      popular-for-that-vehicle list (tier B of listPopularForVehicle);
//   3. neither -> empty list (the caller/frontend hides the section rather
//      than showing a misleadingly-labeled generic list).
export async function listRecommendedForUser(userId: number, limit = DEFAULT_LIMIT) {
  const [orderRows, wishlistRows, viewRows, garageRows] = await Promise.all([
    recommendationsRepository.findOrderAffinity(userId),
    recommendationsRepository.findWishlistAffinity(userId),
    productViewsRepository.findViewAffinity(userId),
    recommendationsRepository.findGarageVehicleCatalogIds(userId),
  ]);

  const categoryScores = new Map<number, number>();
  const brandScores = new Map<number, number>();
  for (const row of orderRows) {
    addAffinity(categoryScores, brandScores, row.productVariant?.product, ORDER_AFFINITY_WEIGHT);
  }
  for (const row of wishlistRows) {
    addAffinity(categoryScores, brandScores, row.product, WISHLIST_AFFINITY_WEIGHT);
  }
  for (const row of viewRows) {
    addAffinity(categoryScores, brandScores, row.product, VIEW_AFFINITY_WEIGHT);
  }

  const garageVehicleIds = [...new Set(garageRows.map((row) => row.vehicleCatalogId))];
  const vehicleWhere: Prisma.ProductWhereInput | undefined =
    garageVehicleIds.length > 0
      ? { OR: await Promise.all(garageVehicleIds.map((id) => buildVehicleCompatibilityWhere(id))) }
      : undefined;

  const hasAffinity = categoryScores.size > 0 || brandScores.size > 0;

  if (hasAffinity) {
    const affinityWhere: Prisma.ProductWhereInput = {
      OR: [
        ...(categoryScores.size > 0 ? [{ categoryId: { in: [...categoryScores.keys()] } }] : []),
        ...(brandScores.size > 0 ? [{ productBrandId: { in: [...brandScores.keys()] } }] : []),
      ],
    };
    const fullWhere: Prisma.ProductWhereInput = vehicleWhere
      ? { AND: [affinityWhere, vehicleWhere] }
      : affinityWhere;

    const poolSize = Math.min(200, limit * 8);
    const candidates = await productsRepository.findManyRaw(fullWhere, poolSize);

    if (candidates.length > 0) {
      const score = (candidate: (typeof candidates)[number]) =>
        (categoryScores.get(candidate.categoryId) ?? 0) +
        (candidate.productBrandId != null ? (brandScores.get(candidate.productBrandId) ?? 0) : 0);

      const ranked = [...candidates].sort((a, b) => score(b) - score(a));
      return ranked.slice(0, limit).map(toProductResponse);
    }
  }

  if (garageVehicleIds.length > 0) {
    const rankedIds = await productsRepository.findPopularProductIds(limit, { productWhere: vehicleWhere });
    if (rankedIds.length > 0) {
      const rows = await productsRepository.findByIds(rankedIds);
      return reorderByIds(rows, rankedIds).map(toProductResponse);
    }
  }

  return [];
}
