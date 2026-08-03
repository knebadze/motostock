import { prisma } from "../../config/prisma.js";

export const usersRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, include: { role: true } });
  },

  findById(id: number) {
    return prisma.user.findUnique({ where: { id }, include: { role: true } });
  },

  findMany() {
    return prisma.user.findMany({
      include: { role: true },
      orderBy: { createdAt: "desc" },
    });
  },

  findByGoogleId(googleId: string) {
    return prisma.user.findUnique({ where: { googleId }, include: { role: true } });
  },

  findByFacebookId(facebookId: string) {
    return prisma.user.findUnique({ where: { facebookId }, include: { role: true } });
  },

  create(data: {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
    roleId: number;
  }) {
    return prisma.user.create({ data, include: { role: true } });
  },

  createOAuthUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    roleId: number;
    googleId?: string;
    facebookId?: string;
  }) {
    return prisma.user.create({ data, include: { role: true } });
  },

  linkGoogleId(id: number, googleId: string) {
    return prisma.user.update({ where: { id }, data: { googleId }, include: { role: true } });
  },

  linkFacebookId(id: number, facebookId: string) {
    return prisma.user.update({ where: { id }, data: { facebookId }, include: { role: true } });
  },

  updatePasswordHash(id: number, passwordHash: string) {
    return prisma.user.update({ where: { id }, data: { passwordHash }, include: { role: true } });
  },
};
