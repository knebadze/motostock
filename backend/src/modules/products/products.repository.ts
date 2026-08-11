import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/index.js";
import { applyProductAdminFilters } from "../filters/product/product-admin-filter-registry.js";
import type { FilterEntry } from "../filters/filter-request.schema.js";
import type { AttributeFilterInput } from "./products.schema.js";

const namedRefSelect = { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } as const;
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

// Exported for reuse by product-buy-together.repository.ts, which needs the
// exact same "product card" shape for the related products it embeds.
export const productSummaryInclude = {
  category: { select: namedRefSelect },
  productBrand: { select: namedRefSelect },
  attributeValues: {
    include: {
      attribute: { select: attributeWithUnitSelect },
      option: { select: { id: true, key: true, labelKa: true, labelEn: true, labelRu: true } },
    },
  },
  variants: {
    select: {
      price: true,
      stockQuantity: true,
      discounts: { select: { discountPrice: true, startDate: true, endDate: true } },
    },
  },
} as const;

const lookupSelect = { id: true, key: true, nameKa: true, nameEn: true, nameRu: true } as const;

// Richer than `productSummaryInclude` above — full per-variant
// images/discounts/size/color are only needed for a single product's detail
// page, not for every product row in a category listing, so this stays a
// separate query shape.
const detailInclude = {
  category: { select: namedRefSelect },
  productBrand: { select: namedRefSelect },
  attributeValues: {
    include: {
      attribute: { select: attributeWithUnitSelect },
      option: { select: { id: true, key: true, labelKa: true, labelEn: true, labelRu: true } },
    },
  },
  variants: {
    include: {
      size: { select: lookupSelect },
      color: { select: lookupSelect },
      condition: { select: lookupSelect },
      status: { select: lookupSelect },
      images: { orderBy: { position: "asc" } },
      discounts: { orderBy: { startDate: "desc" } },
    },
  },
  fitments: {
    include: {
      vehicleCatalog: {
        include: {
          brand: { select: namedRefSelect },
          model: { select: namedRefSelect },
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
  search?: string;
  brandIds?: number[];
  priceMin?: number;
  priceMax?: number;
  onSale?: boolean;
  attributeFilters?: AttributeFilterInput;
  adminFilters?: FilterEntry[];
}): Promise<Prisma.ProductWhereInput | undefined> {
  const and: Prisma.ProductWhereInput[] = [];

  if (filters.categoryIds && filters.categoryIds.length > 0) {
    and.push({ categoryId: { in: filters.categoryIds } });
  }

  if (filters.excludeProductId != null) {
    and.push({ id: { not: filters.excludeProductId } });
  }

  if (filters.vehicleCompatibilityWhere) {
    and.push(filters.vehicleCompatibilityWhere);
  }

  if (filters.search) {
    and.push({
      OR: [
        { nameKa: { contains: filters.search, mode: "insensitive" } },
        { nameEn: { contains: filters.search, mode: "insensitive" } },
        { nameRu: { contains: filters.search, mode: "insensitive" } },
      ],
    });
  }

  if (filters.brandIds && filters.brandIds.length > 0) {
    and.push({ productBrandId: { in: filters.brandIds } });
  }

  if (filters.priceMin != null || filters.priceMax != null) {
    and.push({
      variants: {
        some: {
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
      variants: { some: { discounts: { some: { startDate: { lte: now }, endDate: { gte: now } } } } },
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
    search?: string;
    brandIds?: number[];
    priceMin?: number;
    priceMax?: number;
    onSale?: boolean;
    attributeFilters?: AttributeFilterInput;
    adminFilters?: FilterEntry[];
    limit?: number;
  }) {
    return prisma.product.findMany({
      where: await buildWhere(filters),
      include: productSummaryInclude,
      orderBy: { createdAt: "desc" },
      take: filters.limit,
    });
  },

  findByIds(ids: number[]) {
    return prisma.product.findMany({ where: { id: { in: ids } }, include: productSummaryInclude });
  },

  // Escape hatch for callers (recommendations.service.ts) whose where-clause
  // shape (OR across category/brand affinity, composed with an AND'd vehicle
  // compatibility clause) doesn't fit buildWhere's fixed structured filters.
  findManyRaw(where: Prisma.ProductWhereInput, limit: number) {
    return prisma.product.findMany({
      where,
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
        ...(options?.productWhere ? { productVariant: { product: options.productWhere } } : {}),
      },
      _sum: { quantity: true },
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

  findById(id: number) {
    return prisma.product.findUnique({ where: { id }, include: productSummaryInclude });
  },

  findBySlug(slug: string) {
    return prisma.product.findUnique({ where: { slug } });
  },

  findDetailBySlug(slug: string) {
    return prisma.product.findUnique({ where: { slug }, include: detailInclude });
  },

  create(data: ProductWriteData) {
    return prisma.product.create({ data, include: productSummaryInclude });
  },

  update(id: number, data: Partial<ProductWriteData>) {
    return prisma.product.update({ where: { id }, data, include: productSummaryInclude });
  },

  updateImage(id: number, imageUrl: string) {
    return prisma.product.update({ where: { id }, data: { imageUrl }, include: productSummaryInclude });
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
