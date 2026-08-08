import { prisma } from "../../config/prisma.js";
import { productSummaryInclude } from "../products/products.repository.js";
import type { Prisma } from "../../generated/prisma/index.js";

const include = { relatedProduct: { include: productSummaryInclude } } as const;

const namedRefSelect = { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } as const;
const productRefSelect = { ...namedRefSelect, category: { select: namedRefSelect } } as const;
const adminInclude = {
  product: { select: productRefSelect },
  relatedProduct: { select: productRefSelect },
} as const;

export const productBuyTogetherRepository = {
  findMany(productId: number) {
    return prisma.productBuyTogether.findMany({
      where: { productId },
      include,
      orderBy: { createdAt: "asc" },
    });
  },

  // Admin-only: every pair across every anchor product, not scoped to one
  // productId — powers the /admin/buy-together unified overview.
  findAll(where?: Prisma.ProductBuyTogetherWhereInput) {
    return prisma.productBuyTogether.findMany({
      where,
      include: adminInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: number) {
    return prisma.productBuyTogether.findUnique({ where: { id }, include });
  },

  findByProductAndRelated(productId: number, relatedProductId: number) {
    return prisma.productBuyTogether.findUnique({
      where: { productId_relatedProductId: { productId, relatedProductId } },
    });
  },

  create(data: { productId: number; relatedProductId: number }) {
    return prisma.productBuyTogether.create({ data, include });
  },

  delete(id: number) {
    return prisma.productBuyTogether.delete({ where: { id } });
  },
};
