import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/index.js";

const categorySelect = { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } as const;
const include = { categories: { select: { category: { select: categorySelect } } } } as const;

type ProductBrandWriteData = {
  categoryIds: number[];
  name: string;
  slug: string;
};

// `categoryIds` fully replaces the brand's category links (create: the
// initial set; update: a plain `set`, not a merge — the form always submits
// the complete list it's showing). Deduped so a repeated id can't collide
// on ProductBrandCategory's (productBrandId, categoryId) primary key.
function toCategoriesCreate(categoryIds: number[]) {
  return [...new Set(categoryIds)].map((categoryId) => ({ categoryId }));
}

export const productBrandsRepository = {
  findMany(where?: Prisma.ProductBrandWhereInput, skip?: number, take?: number) {
    return prisma.productBrand.findMany({ where, include, orderBy: { name: "asc" }, skip, take });
  },

  count(where?: Prisma.ProductBrandWhereInput) {
    return prisma.productBrand.count({ where });
  },

  findById(id: number) {
    return prisma.productBrand.findUnique({ where: { id }, include });
  },

  findBySlug(slug: string) {
    return prisma.productBrand.findUnique({ where: { slug } });
  },

  create(data: ProductBrandWriteData) {
    return prisma.productBrand.create({
      data: {
        name: data.name,
        slug: data.slug,
        categories: { create: toCategoriesCreate(data.categoryIds) },
      },
      include,
    });
  },

  update(id: number, data: Partial<ProductBrandWriteData>) {
    return prisma.productBrand.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.categoryIds !== undefined
          ? { categories: { deleteMany: {}, create: toCategoriesCreate(data.categoryIds) } }
          : {}),
      },
      include,
    });
  },

  updateLogo(id: number, logoUrl: string) {
    return prisma.productBrand.update({ where: { id }, data: { logoUrl }, include });
  },

  // Deletes the brand unless a promo code or hero slide is scoped to it —
  // then nothing is deleted and the counts are returned (see
  // product-brands.service.ts's deleteProductBrand).
  deleteUnlessReferenced(id: number) {
    return prisma.$transaction(async (tx) => {
      // Row lock: a concurrent promo/slide save pointing at this brand
      // waits for (then fails on) the delete instead of racing past the count.
      await tx.$queryRaw`SELECT "id" FROM "cla"."ProductBrand" WHERE "id" = ${id} FOR UPDATE`;
      const [promoCodes, heroSlides] = await Promise.all([
        tx.promoCode.count({ where: { productBrandId: id } }),
        tx.heroSlide.count({ where: { discountProductBrandId: id } }),
      ]);
      if (promoCodes > 0 || heroSlides > 0) return { promoCodes, heroSlides };
      await tx.productBrand.delete({ where: { id } });
      return null;
    });
  },

  delete(id: number) {
    return prisma.productBrand.delete({ where: { id } });
  },
};
