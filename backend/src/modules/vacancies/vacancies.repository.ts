import { prisma } from "../../config/prisma.js";

type VacancyWriteData = {
  titleKa?: string;
  titleEn?: string;
  titleRu?: string;
  descriptionKa?: string;
  descriptionEn?: string;
  descriptionRu?: string;
  slug?: string;
  isActive?: boolean;
};

export const vacanciesRepository = {
  findMany(onlyActive?: boolean) {
    return prisma.vacancy.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: number) {
    return prisma.vacancy.findUnique({ where: { id } });
  },

  findBySlug(slug: string) {
    return prisma.vacancy.findUnique({ where: { slug } });
  },

  create(data: Required<VacancyWriteData>) {
    return prisma.vacancy.create({ data });
  },

  update(id: number, data: VacancyWriteData) {
    return prisma.vacancy.update({ where: { id }, data });
  },

  delete(id: number) {
    return prisma.vacancy.delete({ where: { id } });
  },
};
