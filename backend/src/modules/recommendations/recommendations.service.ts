import { ApiError } from "../../lib/ApiError.js";
import { cache } from "../../lib/cache.js";
import { productsRepository } from "../products/products.repository.js";
import { toResponse as toProductResponse, buildVehicleCompatibilityWhere } from "../products/products.service.js";
import { productFitmentRepository } from "../product-fitment/product-fitment.repository.js";
import { productViewsRepository } from "../product-views/product-views.repository.js";
import {
  getRecommendationsCacheTtlMinutes,
  getRecommendationsDefaultLimit,
  getRecommendationOrderWeight,
  getRecommendationViewWeight,
  getRecommendationWishlistWeight,
} from "../settings/settings.service.js";
import { recommendationsRepository } from "./recommendations.repository.js";
import type { Prisma } from "../../generated/prisma/index.js";

// Same TTL and reasoning as products.service.ts's HOMEPAGE_CACHE_TTL_MS —
// none of these rankings are personalized in a way that changing
// second-to-second matters, and this is a low-traffic regional storefront
// where a longer window actually gets reused instead of mostly expiring
// between visits. listRecommendedForUser's cache is keyed by userId (see
// below), so caching it is still safe even though its content is
// personalized — no cross-user leakage, just less recomputation for the
// same visitor's repeat page loads. Admin-configurable via Settings
// (getRecommendationsCacheTtlMinutes, in minutes — converted to ms at each
// cache.set call site below).

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
    throw new ApiError(404, "პროდუქტი ვერ მოიძებნა", "PRODUCT_NOT_FOUND");
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
  const limit = options.limit ?? (await getRecommendationsDefaultLimit());
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

  return Promise.all(ranked.slice(0, limit).map(toProductResponse));
}

// Algorithmic "frequently bought together" — co-purchase counts from
// products.repository.ts's findCoOccurringProductIds, optionally narrowed to
// vehicle-compatible companions. Independent of the admin-curated
// ProductBuyTogether table (see BuyTogether.tsx on the frontend); this is
// meant as a fallback shown when the admin hasn't curated anything for a
// given product.
async function computeFrequentlyBoughtTogether(
  productId: number,
  options: { vehicleCatalogId?: number; limit: number },
) {
  const poolSize = Math.min(100, options.limit * 5);

  const coOccurringIds = await productsRepository.findCoOccurringProductIds(productId, poolSize);
  if (coOccurringIds.length === 0) return [];

  let rankedIds = coOccurringIds;
  if (options.vehicleCatalogId != null) {
    const where = await buildVehicleCompatibilityWhere(options.vehicleCatalogId);
    const matching = await productsRepository.findIdsMatchingWhere(coOccurringIds, where);
    const allowedIds = new Set(matching.map((row) => row.id));
    rankedIds = coOccurringIds.filter((id) => allowedIds.has(id));
  }

  const finalIds = rankedIds.slice(0, options.limit);
  if (finalIds.length === 0) return [];

  const rows = await productsRepository.findByIds(finalIds);
  return Promise.all(reorderByIds(rows, finalIds).map(toProductResponse));
}

// Not personalized — same result for every visitor looking at this product
// (optionally narrowed to the same selected vehicle), so it's cached
// globally by (productId, vehicleCatalogId, limit) rather than per-visitor.
export async function listFrequentlyBoughtTogether(
  productId: number,
  options: { vehicleCatalogId?: number; limit?: number },
) {
  await assertProductExists(productId);
  const limit = options.limit ?? (await getRecommendationsDefaultLimit());
  const cacheKey = `recommendations:boughtTogether:${productId}:${options.vehicleCatalogId ?? "all"}:${limit}`;

  const cached = cache.get<Awaited<ReturnType<typeof toProductResponse>>[]>(cacheKey);
  if (cached) return cached;

  const result = await computeFrequentlyBoughtTogether(productId, {
    vehicleCatalogId: options.vehicleCatalogId,
    limit,
  });
  cache.set(cacheKey, result, (await getRecommendationsCacheTtlMinutes()) * 60_000);
  return result;
}

// "Customers who viewed this also viewed" — view-based co-occurrence
// (product-views.repository.ts's findCoViewedProductIds), same shape as
// listFrequentlyBoughtTogether but from browsing behavior instead of
// completed purchases. A much higher-volume signal (views vastly outnumber
// orders), so it's useful even early on when order history is thin.
async function computeViewedTogether(productId: number, options: { vehicleCatalogId?: number; limit: number }) {
  const poolSize = Math.min(100, options.limit * 5);

  const coViewedIds = await productViewsRepository.findCoViewedProductIds(productId, poolSize);
  if (coViewedIds.length === 0) return [];

  let rankedIds = coViewedIds;
  if (options.vehicleCatalogId != null) {
    const where = await buildVehicleCompatibilityWhere(options.vehicleCatalogId);
    const matching = await productsRepository.findIdsMatchingWhere(coViewedIds, where);
    const allowedIds = new Set(matching.map((row) => row.id));
    rankedIds = coViewedIds.filter((id) => allowedIds.has(id));
  }

  const finalIds = rankedIds.slice(0, options.limit);
  if (finalIds.length === 0) return [];

  const rows = await productsRepository.findByIds(finalIds);
  return Promise.all(reorderByIds(rows, finalIds).map(toProductResponse));
}

// Not personalized, cached the same way and for the same reason as
// listFrequentlyBoughtTogether above.
export async function listViewedTogether(
  productId: number,
  options: { vehicleCatalogId?: number; limit?: number },
) {
  await assertProductExists(productId);
  const limit = options.limit ?? (await getRecommendationsDefaultLimit());
  const cacheKey = `recommendations:viewedTogether:${productId}:${options.vehicleCatalogId ?? "all"}:${limit}`;

  const cached = cache.get<Awaited<ReturnType<typeof toProductResponse>>[]>(cacheKey);
  if (cached) return cached;

  const result = await computeViewedTogether(productId, {
    vehicleCatalogId: options.vehicleCatalogId,
    limit,
  });
  cache.set(cacheKey, result, (await getRecommendationsCacheTtlMinutes()) * 60_000);
  return result;
}

// "Popular for your vehicle" — same order-quantity ranking as the homepage
// POPULAR_PRODUCTS section, restricted to products compatible with one
// vehicle (the shopper's SELECTED_VEHICLE_COOKIE pick).
async function computePopularForVehicle(vehicleCatalogId: number, limit: number) {
  const vehicleWhere = await buildVehicleCompatibilityWhere(vehicleCatalogId);
  const rankedIds = await productsRepository.findPopularProductIds(limit, { productWhere: vehicleWhere });
  if (rankedIds.length === 0) return [];

  const rows = await productsRepository.findByIds(rankedIds);
  return Promise.all(reorderByIds(rows, rankedIds).map(toProductResponse));
}

// Not personalized (same result for every visitor with this vehicle
// selected), cached globally by (vehicleCatalogId, limit) — same reasoning
// as listFrequentlyBoughtTogether above.
export async function listPopularForVehicle(vehicleCatalogId: number, limit?: number) {
  const resolvedLimit = limit ?? (await getRecommendationsDefaultLimit());
  const cacheKey = `recommendations:popularForVehicle:${vehicleCatalogId}:${resolvedLimit}`;

  const cached = cache.get<Awaited<ReturnType<typeof toProductResponse>>[]>(cacheKey);
  if (cached) return cached;

  const result = await computePopularForVehicle(vehicleCatalogId, resolvedLimit);
  cache.set(cacheKey, result, (await getRecommendationsCacheTtlMinutes()) * 60_000);
  return result;
}

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
export async function listRecommendedForUser(userId: number, limit?: number) {
  const resolvedLimit = limit ?? (await getRecommendationsDefaultLimit());
  const cacheKey = `recommendations:forUser:${userId}:${resolvedLimit}`;
  const cached = cache.get<Awaited<ReturnType<typeof toProductResponse>>[]>(cacheKey);
  if (cached) return cached;

  const result = await computeRecommendedForUser(userId, resolvedLimit);
  cache.set(cacheKey, result, (await getRecommendationsCacheTtlMinutes()) * 60_000);
  return result;
}

async function computeRecommendedForUser(userId: number, limit: number) {
  const [orderRows, wishlistRows, viewRows, garageRows, orderWeight, wishlistWeight, viewWeight] =
    await Promise.all([
      recommendationsRepository.findOrderAffinity(userId),
      recommendationsRepository.findWishlistAffinity(userId),
      productViewsRepository.findViewAffinity(userId),
      recommendationsRepository.findGarageVehicleCatalogIds(userId),
      getRecommendationOrderWeight(),
      getRecommendationWishlistWeight(),
      getRecommendationViewWeight(),
    ]);

  const categoryScores = new Map<number, number>();
  const brandScores = new Map<number, number>();
  for (const row of orderRows) {
    addAffinity(categoryScores, brandScores, row.productVariant?.product, orderWeight);
  }
  for (const row of wishlistRows) {
    addAffinity(categoryScores, brandScores, row.product, wishlistWeight);
  }
  for (const row of viewRows) {
    addAffinity(categoryScores, brandScores, row.product, viewWeight);
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
      return Promise.all(ranked.slice(0, limit).map(toProductResponse));
    }
  }

  if (garageVehicleIds.length > 0) {
    const rankedIds = await productsRepository.findPopularProductIds(limit, { productWhere: vehicleWhere });
    if (rankedIds.length > 0) {
      const rows = await productsRepository.findByIds(rankedIds);
      return Promise.all(reorderByIds(rows, rankedIds).map(toProductResponse));
    }
  }

  return [];
}
