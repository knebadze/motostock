import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../lib/ApiError.js";

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
}
