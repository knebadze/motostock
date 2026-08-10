import { prisma } from "../../config/prisma.js";
import type { EmailTemplateKey } from "../../generated/prisma/index.js";

type EmailTemplateWriteData = {
  subjectKa?: string;
  subjectEn?: string;
  subjectRu?: string;
  bodyKa?: string;
  bodyEn?: string;
  bodyRu?: string;
};

export const emailTemplatesRepository = {
  findMany() {
    return prisma.emailTemplate.findMany({ orderBy: { id: "asc" } });
  },

  findByKey(key: EmailTemplateKey) {
    return prisma.emailTemplate.findUnique({ where: { key } });
  },

  findById(id: number) {
    return prisma.emailTemplate.findUnique({ where: { id } });
  },

  create(data: { key: EmailTemplateKey } & Required<EmailTemplateWriteData>) {
    return prisma.emailTemplate.create({ data });
  },

  update(id: number, data: EmailTemplateWriteData) {
    return prisma.emailTemplate.update({ where: { id }, data });
  },
};
