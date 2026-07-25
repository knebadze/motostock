import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../lib/ApiError.js";

export async function getUserById(id: number) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      role: { select: { name: true } },
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    role: user.role.name,
  };
}
