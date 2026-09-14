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

  findBySku(sku: string) {
    return prisma.productVariant.findUnique({ where: { sku }, select: { id: true } });
  },

  create(data: ProductVariantWriteData) {
    return prisma.productVariant.create({ data, include });
  },

  // `stockDelta`, when given, is applied as a single atomic
  // stockQuantity = GREATEST(stockQuantity + delta, 0) statement instead of
  // folding an absolute value into `data` — see
  // product-variants.service.ts's updateProductVariant for why: `data`'s
  // stockQuantity would otherwise silently overwrite whatever checkout's own
  // decrement/increment has driven the real value to since the admin's form
  // last read it. GREATEST(...,0) means this never fails/blocks the admin's
  // save, even if the delta would otherwise drive it negative — same
  // "clamp, don't reject" spirit as everywhere else stock is touched.
  update(id: number, data: Partial<ProductVariantWriteData>, stockDelta?: number) {
    if (!stockDelta) {
      return prisma.productVariant.update({ where: { id }, data, include });
    }
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "dbo"."ProductVariant"
        SET "stockQuantity" = GREATEST("stockQuantity" + ${stockDelta}, 0)
        WHERE "id" = ${id}
      `;
      return tx.productVariant.update({ where: { id }, data, include });
    });
  },

  delete(id: number) {
    return prisma.productVariant.delete({ where: { id } });
  },
};
