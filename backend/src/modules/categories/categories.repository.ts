import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/index.js";

const parentSelect = { id: true, nameKa: true, nameEn: true, nameRu: true } as const;

type CategoryWriteData = {
  nameKa: string;
  nameEn: string;
  nameRu: string;
  slug: string;
  parentId: number | null;
  sortOrder?: number;
  lowStockBadgeEnabled?: boolean;
  onlinePurchaseEnabled?: boolean;
  vehicleFitmentEnabled?: boolean;
};

export const categoriesRepository = {
  findMany(where?: Prisma.CategoryWhereInput) {
    return prisma.category.findMany({
      where,
      include: { parent: { select: parentSelect } },
      orderBy: [{ sortOrder: "asc" }, { nameKa: "asc" }],
    });
  },

  findById(id: number) {
    return prisma.category.findUnique({ where: { id } });
  },

  findBySlug(slug: string) {
    return prisma.category.findUnique({ where: { slug } });
  },

  // The whole tree's inherited switches — tiny (one row per category), read
  // fresh on every use so an admin change applies at once.
  findInheritedFlagTree() {
    return prisma.category.findMany({
      select: { id: true, parentId: true, onlinePurchaseEnabled: true, vehicleFitmentEnabled: true },
    });
  },

  // Storefront-visible items directly in each category (not rolled up):
  // products with an active variant, and active vehicle listings (counted
  // under their catalog model's category). Same visibility rules as the
  // shop listings.
  async countItemsPerCategory() {
    const [productRows, listingRows] = await Promise.all([
      prisma.$queryRaw<{ categoryId: number; count: bigint }[]>`
        SELECT p."categoryId", COUNT(*) AS count
        FROM "dbo"."Product" p
        WHERE EXISTS (
          SELECT 1 FROM "dbo"."ProductVariant" v WHERE v."productId" = p."id" AND v."isActive" = true
        )
        GROUP BY p."categoryId"`,
      prisma.$queryRaw<{ categoryId: number; count: bigint }[]>`
        SELECT m."categoryId", COUNT(*) AS count
        FROM "dbo"."VehicleListing" l
        JOIN "dbo"."VehicleCatalog" vc ON vc."id" = l."vehicleCatalogId"
        JOIN "cla"."Model" m ON m."id" = vc."modelId"
        WHERE l."isActive" = true
        GROUP BY m."categoryId"`,
    ]);
    return [...productRows, ...listingRows].map((row) => ({
      categoryId: row.categoryId,
      count: Number(row.count),
    }));
  },

  countChildren(id: number) {
    return prisma.category.count({ where: { parentId: id } });
  },

  create(data: CategoryWriteData) {
    return prisma.category.create({
      data,
      include: { parent: { select: parentSelect } },
    });
  },

  update(id: number, data: Partial<CategoryWriteData>) {
    return prisma.category.update({
      where: { id },
      data,
      include: { parent: { select: parentSelect } },
    });
  },

  updateImage(id: number, imageUrl: string) {
    return prisma.category.update({ where: { id }, data: { imageUrl } });
  },

  updateBannerImage(id: number, bannerImageUrl: string) {
    return prisma.category.update({ where: { id }, data: { bannerImageUrl } });
  },

  updateMenuImage(id: number, menuImageUrl: string) {
    return prisma.category.update({ where: { id }, data: { menuImageUrl } });
  },

  delete(id: number) {
    return prisma.category.delete({ where: { id } });
  },
};
