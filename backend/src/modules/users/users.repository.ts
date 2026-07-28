import { prisma } from "../../config/prisma.js";

export const usersRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, include: { role: true } });
  },

  findById(id: number) {
    return prisma.user.findUnique({ where: { id }, include: { role: true } });
  },

  findByGoogleId(googleId: string) {
    return prisma.user.findUnique({ where: { googleId }, include: { role: true } });
  },

  findByFacebookId(facebookId: string) {
    return prisma.user.findUnique({ where: { facebookId }, include: { role: true } });
  },

  create(data: {
    email: string;
    name: string;
    passwordHash: string;
    roleId: number;
  }) {
    return prisma.user.create({ data, include: { role: true } });
  },

  createOAuthUser(data: {
    email: string;
    name: string;
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
};
