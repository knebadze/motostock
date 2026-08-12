import { prisma } from "../../config/prisma.js";

export const emailVerificationTokenRepository = {
  create(data: { userId: number; tokenHash: string; expiresAt: Date }) {
    return prisma.emailVerificationToken.create({ data });
  },

  findByTokenHash(tokenHash: string) {
    return prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
  },

  markUsed(id: number) {
    return prisma.emailVerificationToken.update({ where: { id }, data: { usedAt: new Date() } });
  },
};
