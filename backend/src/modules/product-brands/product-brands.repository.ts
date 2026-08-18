import { prisma } from "../../config/prisma.js";

const categorySelect = { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } as const;
const include = { category: { select: categorySelect } } as const;

type ProductBrandWriteData = {
  categoryId: number;
  name: string;
  slug: string;
};

export const productBrandsRepository = {
  findMany(categoryIds?: number[]) {
    return prisma.productBrand.findMany({
      where: categoryIds ? { categoryId: { in: categoryIds } } : undefined,
      include,
      orderBy: { name: "asc" },
    });
  },

  findById(id: number) {
    return prisma.productBrand.findUnique({ where: { id }, include });
  },

  findBySlug(slug: string) {
    return prisma.productBrand.findUnique({ where: { slug } });
  },

  create(data: ProductBrandWriteData) {
    return prisma.productBrand.create({ data, include });
  },

  update(id: number, data: Partial<ProductBrandWriteData>) {
    return prisma.productBrand.update({ where: { id }, data, include });
  },

  updateLogo(id: number, logoUrl: string) {
    return prisma.productBrand.update({ where: { id }, data: { logoUrl }, include });
  },

  delete(id: number) {
    return prisma.productBrand.delete({ where: { id } });
  },
};
