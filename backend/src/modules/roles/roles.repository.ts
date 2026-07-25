import { prisma } from "../../config/prisma.js";

export const rolesRepository = {
  findByName(name: string) {
    return prisma.role.findUnique({ where: { name } });
  },
};
