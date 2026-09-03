import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/index.js";
import { applyProductAdminFilters } from "../filters/product/product-admin-filter-registry.js";
import type { FilterEntry } from "../filters/filter-request.schema.js";
import { getSalesSummaryLimit, getSearchResultCap } from "../settings/settings.service.js";
import type { AttributeFilterInput } from "./products.schema.js";

// lowStockBadgeEnabled is only meaningful for a product's own category (used
// by products.service.ts to gate the storefront urgency badge) — it's
// harmless noise on the other two uses of this select (fitmentRules.category,
// buyTogether's related-product category) but keeping one shared select
// avoids a near-duplicate just for that.
const namedRefSelect = {
  id: true,
  nameKa: true,
  nameEn: true,
  nameRu: true,
  slug: true,
  lowStockBadgeEnabled: true,
} as const;
const brandModelRefSelect = { id: true, name: true, slug: true } as const;
const CANCELLED_KEY = "CANCELLED";

// Bounds the variant-level groupBy candidate pool for findPopularProductIds/
// findCoOccurringProductIds below — without this, groupBy has no `take` at
// all and pulls every distinct productVariantId ever ordered/co-purchased
// into memory before rolling up to product level in JS, which gets linearly
// slower as order history grows. Ranking by DB-side ORDER BY + LIMIT at the
// variant level first, THEN rolling up to product, is a size/accuracy
// tradeoff: a product's true rank could theoretically be missed if its sales
// are split across many variants that each individually fall outside this
// pool. 200 (or limit*20, whichever is larger) is generous enough that this
// is a non-issue for any realistically variant-count-per-product catalog,
// while still turning an unbounded query into a fixed-size one.
function candidatePoolSize(limit: number): number {
  return Math.min(1000, Math.max(limit * 20, 200));
}

export type ProductSortBy = "newest" | "price-asc" | "price-desc";

const unitRefSelect = {
  id: true,
  nameKa: true,
  nameEn: true,
  nameRu: true,
  abbreviationKa: true,
  abbreviationEn: true,
  abbreviationRu: true,
} as const;
const attributeWithUnitSelect = {
  id: true,
  nameKa: true,
  nameEn: true,
  nameRu: true,
  valueType: true,
  unit: { select: unitRefSelect },
} as const;

const attributeValuesInclude = {
  include: {
    attribute: { select: attributeWithUnitSelect },
    option: { select: { id: true, key: true, labelKa: true, labelEn: true, labelRu: true } },
  },
} as const;

// Exported for reuse by compare/wishlist/product-buy-together/product-views
// repositories, which all need the exact same customer-facing "product
// card" shape. Deliberately excludes inactive variants (`isActive: false`)
// from the nested selection — a variant an admin has pulled from sale must
// never factor into a card's price range/stock/discount badge or be
// reachable through any of these customer-facing surfaces. Admin code that
// genuinely needs every variant (create/update/getProduct's own response,
// the admin list) uses adminProductSummaryInclude below instead.
export const productSummaryInclude = {
  category: { select: namedRefSelect },
  productBrand: { select: brandModelRefSelect },
  attributeValues: attributeValuesInclude,
  variants: {
    where: { isActive: true },
    select: {
      price: true,
      stockQuantity: true,
      // orderBy matters here: without it, Postgres doesn't guarantee row
      // order, so two overlapping active discount rows (an admin edit
      // window that outlives its predecessor) could come back in a
      // different order than variantDetailSelect's identically-ordered
      // query below — findActiveDiscount (lib/discounts.ts) just takes the
      // first match, so an unordered card query and the desc-ordered detail
      // query could each pick a different "active" discount for the same
      // variant. desc matches every other discounts query in this codebase.
      discounts: { select: { discountPrice: true, startDate: true, endDate: true }, orderBy: { startDate: "desc" } },
    },
  },
} as const;

// Unfiltered counterpart to productSummaryInclude above — every variant,
// active or not, for the handful of admin-only call sites (findById's
// create/update/updateImage response, so an admin who just deactivated a
// variant still sees it in the response confirming their own save).
const adminProductSummaryInclude = {
  category: { select: namedRefSelect },
  productBrand: { select: brandModelRefSelect },
  attributeValues: attributeValuesInclude,
  variants: {
    select: {
      price: true,
      stockQuantity: true,
      isActive: true,
      // Same ordering as productSummaryInclude above, for the same reason
      // — keeps findActiveDiscount's pick consistent with every other
      // customer- and admin-facing query over this variant's discounts.
      discounts: { select: { discountPrice: true, startDate: true, endDate: true }, orderBy: { startDate: "desc" } },
    },
  },
} as const;

// Lean projection for the admin products list (see productsRepository's
// findManyForAdmin) — that list has no limit/pagination on the backend
// (fetch-everything-filtered, paginate client-side — this codebase's
// deliberate admin-list convention), unlike storefront browsing, which is
// always limit-bounded. Reusing productSummaryInclude's full per-variant
// discounts and complete attributeValues array (needed for storefront card
// rendering — badges, filter facets) for every row of a potentially large,
// unbounded fetch was needlessly heavy: ProductsManager.tsx's table only
// ever renders name/category/brand/price-range/stock/variant-count/
// view-count, never attributeValues or a discount badge (the admin detail
// modal fetches full per-product data separately when actually needed).
const adminListInclude = {
  category: { select: namedRefSelect },
  productBrand: { select: brandModelRefSelect },
  variants: { select: { price: true, stockQuantity: true } },
} as const;

const lookupSelect = { id: true, key: true, nameKa: true, nameEn: true, nameRu: true } as const;

// Richer than `productSummaryInclude` above — full per-variant
// images/discounts/size/color are only needed for a single product's detail
// page, not for every product row in a category listing, so this stays a
// separate query shape.
const variantDetailSelect = {
  size: { select: lookupSelect },
  color: { select: lookupSelect },
  condition: { select: lookupSelect },
  status: { select: lookupSelect },
  images: { orderBy: { position: "asc" } },
  discounts: { orderBy: { startDate: "desc" } },
} as const;

const detailIncludeBase = {
  category: { select: namedRefSelect },
  productBrand: { select: brandModelRefSelect },
  attributeValues: attributeValuesInclude,
  fitments: {
    include: {
      vehicleCatalog: {
        include: {
          brand: { select: brandModelRefSelect },
          model: { select: brandModelRefSelect },
        },
      },
    },
  },
  fitmentRules: {
    include: {
      category: { select: namedRefSelect },
    },
  },
  // Admin-curated "frequently bought together" companions — embedded here so
  // the public detail endpoint can surface them in one query, same as
  // fitments/fitmentRules above.
  buyTogether: {
    include: { relatedProduct: { include: productSummaryInclude } },
    orderBy: { createdAt: "asc" },
  },
} as const;

// Admin "full view" — every variant, active or not (findDetailById below).
const detailInclude = {
  ...detailIncludeBase,
  variants: { include: variantDetailSelect },
} as const;

// Customer-facing detail page (findDetailBySlug below) — a variant an admin
// has pulled from sale must not be selectable/orderable here, same
// isActive reasoning as productSummaryInclude above.
const storefrontDetailInclude = {
  ...detailIncludeBase,
  variants: { where: { isActive: true }, include: variantDetailSelect },
} as const;

type ProductWriteData = {
  categoryId: number;
  productBrandId?: number | null;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  descriptionKa?: string | null;
  descriptionEn?: string | null;
  descriptionRu?: string | null;
  slug: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
};

type AttributeValueWriteData = {
  attributeId: number;
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  optionId: number | null;
};

async function buildWhere(filters: {
  categoryIds?: number[];
  excludeProductId?: number;
  // Pre-resolved by products.service.ts (which knows how to translate a
  // vehicleCatalogId into "explicit fitment OR a matching fitment rule") —
  // the repository just ANDs it in, same as adminWhere below.
  vehicleCompatibilityWhere?: Prisma.ProductWhereInput;
  // Pre-ranked by findSearchRankedIds below (pg_trgm word-similarity, not a
  // plain `contains`) — the repository just ANDs the id set in, same as
  // vehicleCompatibilityWhere above. Relevance order is restored afterward
  // by products.service.ts's listProducts, since `id: {in: [...]}` doesn't
  // preserve array order.
  searchIds?: number[];
  brandIds?: number[];
  priceMin?: number;
  priceMax?: number;
  onSale?: boolean;
  attributeFilters?: AttributeFilterInput;
  adminFilters?: FilterEntry[];
  // True only from the customer-facing findMany/count below. priceMin/
  // priceMax/onSale below each independently ask "does *some* variant match
  // this?" — without also requiring isActive on that same variant, a
  // product could match purely because of a variant nothing can actually
  // buy (e.g. priced in range or discounted, but inactive), even though the
  // separate `{ variants: { some: { isActive: true } } }` clause findMany
  // ANDs in only guarantees *a* variant is active, not that it's the *same*
  // one satisfying the price/sale condition. The admin paths intentionally
  // don't set this — an admin filtering by price/sale should still be able
  // to find inactive variants too.
  requireActiveVariant?: boolean;
}): Promise<Prisma.ProductWhereInput | undefined> {
  const and: Prisma.ProductWhereInput[] = [];
  const activeVariantFilter: Prisma.ProductVariantWhereInput = filters.requireActiveVariant
    ? { isActive: true }
    : {};

  if (filters.categoryIds && filters.categoryIds.length > 0) {
    and.push({ categoryId: { in: filters.categoryIds } });
  }

  if (filters.excludeProductId != null) {
    and.push({ id: { not: filters.excludeProductId } });
  }

  if (filters.vehicleCompatibilityWhere) {
    and.push(filters.vehicleCompatibilityWhere);
  }

  if (filters.searchIds) {
    and.push({ id: { in: filters.searchIds } });
  }

  if (filters.brandIds && filters.brandIds.length > 0) {
    and.push({ productBrandId: { in: filters.brandIds } });
  }

  if (filters.priceMin != null || filters.priceMax != null) {
    and.push({
      variants: {
        some: {
          ...activeVariantFilter,
          price: {
            ...(filters.priceMin != null ? { gte: filters.priceMin } : {}),
            ...(filters.priceMax != null ? { lte: filters.priceMax } : {}),
          },
        },
      },
    });
  }

  if (filters.onSale) {
    const now = new Date();
    and.push({
      variants: {
        some: {
          ...activeVariantFilter,
          discounts: { some: { startDate: { lte: now }, endDate: { gte: now } } },
        },
      },
    });
  }

  for (const facet of filters.attributeFilters?.selectFilters ?? []) {
    and.push({
      attributeValues: { some: { attributeId: facet.attributeId, optionId: { in: facet.optionIds } } },
    });
  }

  for (const attributeId of filters.attributeFilters?.booleanAttributeIds ?? []) {
    and.push({ attributeValues: { some: { attributeId, valueBoolean: true } } });
  }

  for (const range of filters.attributeFilters?.numberRanges ?? []) {
    and.push({
      attributeValues: {
        some: {
          attributeId: range.attributeId,
          valueNumber: {
            ...(range.min != null ? { gte: range.min } : {}),
            ...(range.max != null ? { lte: range.max } : {}),
          },
        },
      },
    });
  }

  const adminWhere = await applyProductAdminFilters(filters.adminFilters);
  if (adminWhere) and.push(adminWhere);

  return and.length > 0 ? { AND: and } : undefined;
}

export const productsRepository = {
  async findMany(filters: {
    categoryIds?: number[];
    excludeProductId?: number;
    vehicleCompatibilityWhere?: Prisma.ProductWhereInput;
    searchIds?: number[];
    brandIds?: number[];
    priceMin?: number;
    priceMax?: number;
    onSale?: boolean;
    attributeFilters?: AttributeFilterInput;
    adminFilters?: FilterEntry[];
    limit?: number;
    // Real offset pagination (see products.service.ts's listProducts) — only
    // ever set together with `limit` acting as the page size.
    skip?: number;
    // True for a real "newest"-sorted paginated storefront request
    // (page/pageSize sent) — applies skip/take even when searchIds is set.
    // False/absent (every legacy caller, and the price-sorted storefront
    // path — see listProducts) preserves the old behavior: skip/take are
    // suppressed whenever searchIds is present, so the caller can fetch
    // every matching candidate itself (to rank by relevance, or by price,
    // in JS) and slice to `limit` itself.
    paginate?: boolean;
  }) {
    const structuredWhere = await buildWhere({ ...filters, requireActiveVariant: true });
    const suppressPagination = !filters.paginate && filters.searchIds != null;
    return prisma.product.findMany({
      // Customer-facing path only (findManyForAdmin below is the admin
      // equivalent) — a product left with zero active variants has nothing
      // purchasable, so it's excluded outright rather than shown as an
      // empty/priceless card (productSummaryInclude's own variants filter
      // only hides the individual inactive variants, not the product row).
      where: {
        AND: [
          ...(structuredWhere ? [structuredWhere] : []),
          { variants: { some: { isActive: true } } },
        ],
      },
      include: productSummaryInclude,
      orderBy: { createdAt: "desc" },
      skip: suppressPagination ? undefined : filters.skip,
      take: suppressPagination ? undefined : filters.limit,
    });
  },

  // Paired with findMany above — same where-shape (including the
  // active-variant exclusion and searchIds, when present), for real "how
  // many pages" totals on the customer browse/search path.
  async count(filters: {
    categoryIds?: number[];
    excludeProductId?: number;
    vehicleCompatibilityWhere?: Prisma.ProductWhereInput;
    searchIds?: number[];
    brandIds?: number[];
    priceMin?: number;
    priceMax?: number;
    onSale?: boolean;
    attributeFilters?: AttributeFilterInput;
  }) {
    const structuredWhere = await buildWhere({ ...filters, requireActiveVariant: true });
    return prisma.product.count({
      where: {
        AND: [
          ...(structuredWhere ? [structuredWhere] : []),
          { variants: { some: { isActive: true } } },
        ],
      },
    });
  },

  // See adminListInclude above for why this is a separate method rather
  // than just findMany with a different include — no `searchIds` param,
  // since the admin panel never sends one (it always fetches the filtered
  // set unranked, sorted by createdAt like findMany's default; skip/take
  // below give it real server-side pagination instead of findMany's
  // relevance-ranking-driven `limit`).
  async findManyForAdmin(filters: {
    categoryIds?: number[];
    brandIds?: number[];
    priceMin?: number;
    priceMax?: number;
    onSale?: boolean;
    attributeFilters?: AttributeFilterInput;
    adminFilters?: FilterEntry[];
    skip?: number;
    take?: number;
  }) {
    return prisma.product.findMany({
      where: await buildWhere(filters),
      include: adminListInclude,
      orderBy: { createdAt: "desc" },
      skip: filters.skip,
      take: filters.take,
    });
  },

  // Paired with findManyForAdmin above — same buildWhere call, so the count
  // always matches what that query would return unpaginated.
  async countForAdmin(filters: {
    categoryIds?: number[];
    brandIds?: number[];
    priceMin?: number;
    priceMax?: number;
    onSale?: boolean;
    attributeFilters?: AttributeFilterInput;
    adminFilters?: FilterEntry[];
  }) {
    return prisma.product.count({ where: await buildWhere(filters) });
  },

  // Typo-tolerant, relevance-ranked search — pg_trgm word_similarity instead
  // of a plain `contains`. `%>` (word-similarity) is used rather than `%`
  // (whole-string similarity) because whole-string similarity dilutes badly
  // against longer product names (a short query matched inside a much
  // longer name scores low even on an exact substring hit); word_similarity
  // instead scores the best-matching word-boundary span within the name, so
  // "ჩაფხუტი" scores 1.0 against "სპორტ-ტურინგ დახურული ჩაფხუტი" just as it
  // does against "ჩაფხუტი" alone. Both operators are accelerated by the
  // pg_trgm GIN indexes added in the search_and_popularity_scaling
  // migration (same indexes that already sped up the old `contains`/ILIKE
  // queries). Verified live against the dev DB — see conversation history.
  // Returns ids only, ordered by relevance DESC; findMany's `id: {in: [...]}`
  // doesn't preserve that order, so callers must re-apply it (same caveat as
  // findPopularProductIds below).
  // Bounds this method the same way candidatePoolSize bounds the popularity
  // queries above — without a cap, a very generic search term could match a
  // large fraction of the catalog, and no storefront view ever needs more
  // ranked results than this in one response. Admin-configurable via
  // Settings (getSearchResultCap), default 500.
  async findSearchRankedIds(search: string, limit?: number): Promise<number[]> {
    const cap = limit != null ? candidatePoolSize(limit) : await getSearchResultCap();
    const rows = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id
      FROM "dbo"."Product"
      WHERE "nameKa" %> ${search} OR "nameEn" %> ${search} OR "nameRu" %> ${search}
      ORDER BY
        GREATEST(
          word_similarity(${search}, "nameKa"),
          word_similarity(${search}, "nameEn"),
          word_similarity(${search}, "nameRu")
        ) DESC,
        -- Many results legitimately tie at the max score of 1.0 (word
        -- similarity treats any whole-word substring match as a perfect
        -- hit, regardless of how many other words surround it) — without a
        -- tiebreaker, Postgres returns ties in an arbitrary scan order, so
        -- an exact/short match like "ჩაფხუტი" isn't guaranteed to outrank a
        -- longer name that merely contains it, e.g. "დახურული ჩაფხუტი".
        -- Preferring the shorter name surfaces the closer match first.
        LENGTH("nameKa") ASC
      LIMIT ${cap}
    `;
    return rows.map((row) => row.id);
  },

  // Customer-facing only (products.service.ts's listPopularProducts,
  // recommendations.service.ts) — excludes a product left with zero active
  // variants, same reasoning as findMany above (a ranked/recommended id
  // whose product has since gone fully inactive shouldn't surface as an
  // empty card).
  findByIds(ids: number[]) {
    return prisma.product.findMany({
      where: { id: { in: ids }, variants: { some: { isActive: true } } },
      include: productSummaryInclude,
    });
  },

  // Escape hatch for callers (recommendations.service.ts) whose where-clause
  // shape (OR across category/brand affinity, composed with an AND'd vehicle
  // compatibility clause) doesn't fit buildWhere's fixed structured filters.
  // Customer-facing only — same active-variant exclusion as findMany/findByIds.
  findManyRaw(where: Prisma.ProductWhereInput, limit: number) {
    return prisma.product.findMany({
      where: { AND: [where, { variants: { some: { isActive: true } } }] },
      include: productSummaryInclude,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  incrementViewCount(id: number) {
    return prisma.product.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      select: { id: true },
    });
  },

  // Ranks products by total sold quantity (OrderItem.quantity, grouped by
  // productVariantId then rolled up to the owning product) — powers the
  // homepage "popular products" slider. Returns just the ordered id list;
  // callers fetch full rows via findByIds and must re-apply this order
  // themselves (findByIds/findMany don't preserve `in` array order).
  //
  // `productWhere` narrows which products are even eligible to rank, e.g.
  // buildVehicleCompatibilityWhere's output for "popular among products that
  // fit this vehicle" — filtered through the OrderItem->ProductVariant
  // relation so it's one query instead of pre-fetching a candidate id list.
  async findPopularProductIds(
    limit: number,
    options?: { productWhere?: Prisma.ProductWhereInput },
  ): Promise<number[]> {
    const grouped = await prisma.orderItem.groupBy({
      by: ["productVariantId"],
      where: {
        productVariantId: { not: null },
        order: { status: { key: { not: CANCELLED_KEY } } },
        ...(options?.productWhere ? { productVariant: { product: options.productWhere } } : {}),
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: candidatePoolSize(limit),
    });
    if (grouped.length === 0) return [];

    const variantIds = grouped.map((group) => group.productVariantId as number);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, productId: true },
    });
    const productIdByVariantId = new Map(variants.map((variant) => [variant.id, variant.productId]));

    const totalsByProductId = new Map<number, number>();
    for (const group of grouped) {
      const productId = productIdByVariantId.get(group.productVariantId as number);
      if (productId == null) continue;
      const quantity = group._sum.quantity ?? 0;
      totalsByProductId.set(productId, (totalsByProductId.get(productId) ?? 0) + quantity);
    }

    return Array.from(totalsByProductId.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([productId]) => productId);
  },

  // Algorithmic "frequently bought together": every other product that has
  // shared at least one order with `productId` (any of its variants),
  // ranked by how many distinct orders they co-occurred in. Cart/order rows
  // are unique per (owner, variant), so counting OrderItem rows here already
  // counts distinct orders — no separate dedup step needed.
  async findCoOccurringProductIds(productId: number, limit: number): Promise<number[]> {
    const anchorVariants = await prisma.productVariant.findMany({
      where: { productId },
      select: { id: true },
    });
    const anchorVariantIds = anchorVariants.map((variant) => variant.id);
    if (anchorVariantIds.length === 0) return [];

    const anchorOrderRows = await prisma.orderItem.findMany({
      where: { itemType: "PRODUCT_VARIANT", productVariantId: { in: anchorVariantIds } },
      select: { orderId: true },
      distinct: ["orderId"],
    });
    const orderIds = anchorOrderRows.map((row) => row.orderId);
    if (orderIds.length === 0) return [];

    const grouped = await prisma.orderItem.groupBy({
      by: ["productVariantId"],
      where: {
        orderId: { in: orderIds },
        itemType: "PRODUCT_VARIANT",
        productVariantId: { notIn: anchorVariantIds },
      },
      _count: { orderId: true },
      orderBy: { _count: { orderId: "desc" } },
      take: candidatePoolSize(limit),
    });
    if (grouped.length === 0) return [];

    const companionVariantIds = grouped.map((group) => group.productVariantId as number);
    const companionVariants = await prisma.productVariant.findMany({
      where: { id: { in: companionVariantIds } },
      select: { id: true, productId: true },
    });
    const productIdByVariantId = new Map(companionVariants.map((v) => [v.id, v.productId]));

    const countsByProductId = new Map<number, number>();
    for (const group of grouped) {
      const companionProductId = productIdByVariantId.get(group.productVariantId as number);
      if (companionProductId == null) continue;
      const count = group._count.orderId;
      countsByProductId.set(companionProductId, (countsByProductId.get(companionProductId) ?? 0) + count);
    }

    return Array.from(countsByProductId.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
  },

  // Shared by the (technically public but frontend-unused) GET /products/:id
  // route and, more importantly, updateProduct/setProductImage's own "confirm
  // what was just saved" response below — an admin who just deactivated a
  // variant must still see it in that response, so this stays unfiltered
  // rather than switching to productSummaryInclude.
  findById(id: number) {
    return prisma.product.findUnique({ where: { id }, include: adminProductSummaryInclude });
  },

  findBySlug(slug: string) {
    return prisma.product.findUnique({ where: { slug } });
  },

  findDetailBySlug(slug: string) {
    return prisma.product.findUnique({ where: { slug }, include: storefrontDetailInclude });
  },

  // Admin "full view" counterpart to findDetailBySlug — every variant,
  // active or not (see detailInclude above), looked up by id since that's
  // what the admin products table already has on hand.
  findDetailById(id: number) {
    return prisma.product.findUnique({ where: { id }, include: detailInclude });
  },

  // Sales history for the admin detail modal — OrderItem has no direct
  // productId (only productVariantId, see order-item.prisma), so this is
  // scoped to the caller's own variant ids rather than a single product FK
  // lookup. Aggregate totals + a distinct-order count + the 10 most recent
  // orders that included any of this product's variants.
  async findSalesSummary(variantIds: number[]) {
    if (variantIds.length === 0) {
      return { totalQuantitySold: 0, totalRevenue: 0, orderCount: 0, recentOrders: [] };
    }

    const where = { productVariantId: { in: variantIds } };
    const salesSummaryLimit = await getSalesSummaryLimit();
    const [totals, distinctOrders, recentItems] = await Promise.all([
      prisma.orderItem.aggregate({ where, _sum: { quantity: true, lineTotal: true } }),
      prisma.orderItem.findMany({ where, select: { orderId: true }, distinct: ["orderId"] }),
      prisma.orderItem.findMany({
        where,
        select: {
          quantity: true,
          lineTotal: true,
          order: {
            select: {
              id: true,
              orderCode: true,
              createdAt: true,
              status: { select: { nameKa: true } },
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: salesSummaryLimit,
      }),
    ]);

    return {
      totalQuantitySold: totals._sum.quantity ?? 0,
      totalRevenue: Number(totals._sum.lineTotal ?? 0),
      orderCount: distinctOrders.length,
      recentOrders: recentItems.map((item) => ({
        orderId: item.order.id,
        orderCode: item.order.orderCode,
        createdAt: item.order.createdAt,
        buyerName: `${item.order.user.firstName} ${item.order.user.lastName}`.trim(),
        buyerEmail: item.order.user.email,
        quantity: item.quantity,
        lineTotal: Number(item.lineTotal),
        status: item.order.status.nameKa,
      })),
    };
  },

  create(data: ProductWriteData) {
    return prisma.product.create({ data, include: adminProductSummaryInclude });
  },

  update(id: number, data: Partial<ProductWriteData>) {
    return prisma.product.update({ where: { id }, data, include: adminProductSummaryInclude });
  },

  updateImage(id: number, imageUrl: string) {
    return prisma.product.update({ where: { id }, data: { imageUrl }, include: adminProductSummaryInclude });
  },

  delete(id: number) {
    return prisma.product.delete({ where: { id } });
  },

  // Narrows a candidate id list down to the ones matching an arbitrary
  // Product where-clause — used by getProductDetail to filter buyTogether
  // companions against buildVehicleCompatibilityWhere's result.
  findIdsMatchingWhere(ids: number[], where: Prisma.ProductWhereInput) {
    return prisma.product.findMany({
      where: { AND: [{ id: { in: ids } }, where] },
      select: { id: true },
    });
  },

  // Attribute values are always submitted as the full current set for the
  // product, so a create/update is a delete-then-recreate inside one
  // transaction rather than a per-row upsert.
  async replaceAttributeValues(productId: number, values: AttributeValueWriteData[]) {
    await prisma.$transaction([
      prisma.productAttributeValue.deleteMany({ where: { productId } }),
      ...(values.length > 0
        ? [
            prisma.productAttributeValue.createMany({
              data: values.map((value) => ({ productId, ...value })),
            }),
          ]
        : []),
    ]);
  },
};
