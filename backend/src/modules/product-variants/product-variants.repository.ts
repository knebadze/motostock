import { prisma } from "../../config/prisma.js";

const namedRefSelect = { id: true, nameKa: true, nameEn: true, nameRu: true } as const;

const include = {
  product: { select: namedRefSelect },
  size: true,
  color: true,
  condition: true,
  status: true,
  discounts: { orderBy: { startDate: "desc" } },
  images: { orderBy: { position: "asc" } },
} as const;

type ProductVariantWriteData = {
  productId: number;
  sku?: string | null;
  finaId?: number | null;
  sizeId?: number | null;
  colorId?: number | null;
  price: number;
  stockQuantity?: number;
  conditionId?: number | null;
  statusId?: number | null;
  isActive?: boolean;
};

export const productVariantsRepository = {
  findMany(productId?: number) {
    return prisma.productVariant.findMany({
      where: productId ? { productId } : undefined,
      include,
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: number) {
    return prisma.productVariant.findUnique({ where: { id }, include });
  },

  findByFinaId(finaId: number) {
    return prisma.productVariant.findUnique({ where: { finaId }, select: { id: true } });
  },

  create(data: ProductVariantWriteData) {
    return prisma.productVariant.create({ data, include });
  },

  update(id: number, data: Partial<ProductVariantWriteData>) {
    return prisma.productVariant.update({ where: { id }, data, include });
  },

  delete(id: number) {
    return prisma.productVariant.delete({ where: { id } });
  },
};
