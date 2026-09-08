import { prisma } from "../../config/prisma.js";

const brandModelRefSelect = { id: true, name: true, slug: true } as const;
const lookupSelect = { id: true, key: true, nameKa: true, nameEn: true, nameRu: true } as const;
const attributeSelect = { id: true, nameKa: true, nameEn: true, nameRu: true, valueType: true } as const;
const optionSelect = { id: true, key: true, labelKa: true, labelEn: true, labelRu: true } as const;

const candidateSelect = {
  id: true,
  nameKa: true,
  nameEn: true,
  nameRu: true,
  slug: true,
  productBrand: { select: brandModelRefSelect },
  attributeValues: {
    include: {
      attribute: { select: attributeSelect },
      option: { select: optionSelect },
    },
  },
  variants: {
    select: {
      id: true,
      sku: true,
      price: true,
      size: { select: lookupSelect },
      color: { select: lookupSelect },
      // orderBy desc matches every other discounts query in the codebase
      // (products.repository.ts, product-variants.repository.ts, ...) — a
      // variant with overlapping active discount rows must resolve to the
      // same "active" one (findActiveDiscount, lib/discounts.ts, takes the
      // first match) here as it does on the storefront card/detail pages,
      // or this admin candidate preview would show a different current
      // discount than what customers actually see.
      discounts: { select: { discountPercent: true, startDate: true, endDate: true }, orderBy: { startDate: "desc" } },
    },
  },
} as const;

const discountHistorySelect = {
  id: true,
  discountPrice: true,
  discountPercent: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  productVariant: {
    select: {
      id: true,
      sku: true,
      price: true,
      size: { select: lookupSelect },
      color: { select: lookupSelect },
      product: {
        select: {
          id: true,
          nameKa: true,
          nameEn: true,
          nameRu: true,
          slug: true,
          productBrand: { select: brandModelRefSelect },
        },
      },
    },
  },
} as const;

export const bulkProductDiscountsRepository = {
  // Every product in the given (already category+descendant resolved) set
  // of category ids, with everything the bulk-discount candidate table
  // needs to render one row per variant.
  findCandidateProducts(categoryIds: number[]) {
    return prisma.product.findMany({
      where: { categoryId: { in: categoryIds } },
      select: candidateSelect,
      orderBy: { nameKa: "asc" },
    });
  },

  findVariantsForDiscount(variantIds: number[]) {
    return prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, price: true },
    });
  },

  async bulkCreateDiscounts(
    rows: { productVariantId: number; discountPrice: number; discountPercent: number; startDate: Date; endDate: Date }[],
  ) {
    return prisma.$transaction(rows.map((row) => prisma.productVariantDiscount.create({ data: row })));
  },

  // Every ProductVariantDiscount that exists, regardless of category —
  // powers the discounts-page "history" tab, not scoped to a bulk-selection
  // session the way findCandidateProducts above is. Capped at
  // DISCOUNT_HISTORY_MAX_ROWS — see bulk-product-discounts.service.ts's
  // listProductDiscountHistory for why (this table merges with
  // bulk-vehicle-listing-discounts' identical history into one admin
  // table, which makes true server-side pagination of the combined,
  // client-side-sortable result disproportionately complex for what this
  // history view actually needs).
  findAllDiscounts(search: string | undefined, take: number) {
    return prisma.productVariantDiscount.findMany({
      where: discountSearchWhere(search),
      select: discountHistorySelect,
      orderBy: { startDate: "desc" },
      take,
    });
  },

  countAllDiscounts(search?: string) {
    return prisma.productVariantDiscount.count({ where: discountSearchWhere(search) });
  },
};

function discountSearchWhere(search?: string) {
  return search
    ? {
        productVariant: {
          product: {
            OR: [
              { nameKa: { contains: search, mode: "insensitive" as const } },
              { nameEn: { contains: search, mode: "insensitive" as const } },
              { nameRu: { contains: search, mode: "insensitive" as const } },
            ],
          },
        },
      }
    : undefined;
}
