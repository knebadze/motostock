import { prisma } from "../../config/prisma.js";

const include = { position: true } as const;

type TeamMemberWriteData = {
  nameKa?: string;
  nameEn?: string;
  nameRu?: string;
  positionId?: number;
  isActive?: boolean;
};

export const teamMembersRepository = {
  findMany(onlyActive?: boolean) {
    return prisma.teamMember.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      include,
      orderBy: { sortOrder: "asc" },
    });
  },

  findById(id: number) {
    return prisma.teamMember.findUnique({ where: { id }, include });
  },

  async create(data: Required<TeamMemberWriteData>) {
    const { _max } = await prisma.teamMember.aggregate({ _max: { sortOrder: true } });
    return prisma.teamMember.create({
      data: { ...data, sortOrder: (_max.sortOrder ?? -1) + 1 },
      include,
    });
  },

  update(id: number, data: TeamMemberWriteData) {
    return prisma.teamMember.update({ where: { id }, data, include });
  },

  updateImage(id: number, imageUrl: string) {
    return prisma.teamMember.update({ where: { id }, data: { imageUrl }, include });
  },

  async reorder(ids: number[]) {
    await Promise.all(ids.map((id, index) => prisma.teamMember.update({ where: { id }, data: { sortOrder: index } })));
  },

  delete(id: number) {
    return prisma.teamMember.delete({ where: { id } });
  },
};
