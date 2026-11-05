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

  delete(id: number) {
    return prisma.productBrand.delete({ where: { id } });
  },
};
