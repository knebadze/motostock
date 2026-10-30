import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/index.js";

type BrandWriteData = {
  name: string;
  slug: string;
};

export const brandsRepository = {
  findMany(where?: Prisma.BrandWhereInput, skip?: number, take?: number) {
    return prisma.brand.findMany({ where, orderBy: { name: "asc" }, skip, take });
  },

  count(where?: Prisma.BrandWhereInput) {
    return prisma.brand.count({ where });
  },

  findById(id: number) {
    return prisma.brand.findUnique({ where: { id } });
  },

  findBySlug(slug: string) {
    return prisma.brand.findUnique({ where: { slug } });
  },

  create(data: BrandWriteData) {
    return prisma.brand.create({ data });
  },

  update(id: number, data: Partial<BrandWriteData>) {
    return prisma.brand.update({ where: { id }, data });
  },

  updateLogo(id: number, logoUrl: string) {
    return prisma.brand.update({ where: { id }, data: { logoUrl } });
  },

  delete(id: number) {
    return prisma.brand.delete({ where: { id } });
  },
};
