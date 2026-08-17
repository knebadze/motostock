import { prisma } from "../../config/prisma.js";

type FaqWriteData = {
  questionKa?: string;
  questionEn?: string;
  questionRu?: string;
  answerKa?: string;
  answerEn?: string;
  answerRu?: string;
  isActive?: boolean;
};

export const faqRepository = {
  findMany(onlyActive?: boolean) {
    return prisma.faq.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { sortOrder: "asc" },
    });
  },

  findById(id: number) {
    return prisma.faq.findUnique({ where: { id } });
  },

  async create(data: Required<FaqWriteData>) {
    const { _max } = await prisma.faq.aggregate({ _max: { sortOrder: true } });
    return prisma.faq.create({ data: { ...data, sortOrder: (_max.sortOrder ?? -1) + 1 } });
  },

  update(id: number, data: FaqWriteData) {
    return prisma.faq.update({ where: { id }, data });
  },

  async reorder(ids: number[]) {
    await Promise.all(ids.map((id, index) => prisma.faq.update({ where: { id }, data: { sortOrder: index } })));
  },

  delete(id: number) {
    return prisma.faq.delete({ where: { id } });
  },
};
