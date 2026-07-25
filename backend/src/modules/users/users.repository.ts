import { prisma } from "../../config/prisma.js";

export const usersRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, include: { role: true } });
  },

  findById(id: number) {
    return prisma.user.findUnique({ where: { id }, include: { role: true } });
  },

  create(data: {
    email: string;
    name: string;
    passwordHash: string;
    roleId: number;
  }) {
    return prisma.user.create({ data, include: { role: true } });
  },
};
