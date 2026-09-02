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
  // productId — powers the /admin/buy-together unified overview. Real
  // server-side pagination (skip/take), mirroring error-logs.repository.ts.
  findAll(where: Prisma.ProductBuyTogetherWhereInput | undefined, skip: number, take: number) {
    return prisma.productBuyTogether.findMany({
      where,
      include: adminInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  },

  count(where?: Prisma.ProductBuyTogetherWhereInput) {
    return prisma.productBuyTogether.count({ where });
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
