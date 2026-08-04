import { prisma } from "../../config/prisma.js";
import type { ProductFitmentRuleType, VehicleSpecField } from "../../generated/prisma/index.js";

const namedRefSelect = { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } as const;

const include = {
  category: { select: namedRefSelect },
} as const;

type ProductFitmentRuleWriteData = {
  productId: number;
  type: ProductFitmentRuleType;
  categoryId?: number | null;
  specField?: VehicleSpecField | null;
  specLookupItemId?: number | null;
};

export const productFitmentRulesRepository = {
  findMany(productId: number) {
    return prisma.productFitmentRule.findMany({
      where: { productId },
      include,
      orderBy: { createdAt: "asc" },
    });
  },

  findById(id: number) {
    return prisma.productFitmentRule.findUnique({ where: { id }, include });
  },

  findByProductAndCategory(productId: number, categoryId: number) {
    return prisma.productFitmentRule.findFirst({
      where: { productId, type: "CATEGORY", categoryId },
    });
  },

  findByProductAndSpec(productId: number, specField: VehicleSpecField, specLookupItemId: number) {
    return prisma.productFitmentRule.findFirst({
      where: { productId, type: "SPEC", specField, specLookupItemId },
    });
  },

  findByProductAndAllType(productId: number) {
    return prisma.productFitmentRule.findFirst({ where: { productId, type: "ALL" } });
  },

  create(data: ProductFitmentRuleWriteData) {
    return prisma.productFitmentRule.create({ data, include });
  },

  delete(id: number) {
    return prisma.productFitmentRule.delete({ where: { id } });
  },
};
