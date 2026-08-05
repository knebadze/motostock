import { prisma } from "../../config/prisma.js";

const namedRefSelect = { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } as const;
const lookupSelect = { id: true, key: true, nameKa: true, nameEn: true, nameRu: true } as const;
const attributeSelect = { id: true, nameKa: true, nameEn: true, nameRu: true, valueType: true } as const;
const optionSelect = { id: true, key: true, labelKa: true, labelEn: true, labelRu: true } as const;

const candidateSelect = {
  id: true,
  nameKa: true,
  nameEn: true,
  nameRu: true,
  slug: true,
  productBrand: { select: namedRefSelect },
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
      discounts: { select: { discountPercent: true, startDate: true, endDate: true } },
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
};
