import { ApiError } from "../../lib/ApiError.js";
import { usersRepository } from "./users.repository.js";

export async function getUserById(id: number) {
  const user = await usersRepository.findById(id);

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

export async function listUsers() {
  const users = await usersRepository.findMany();

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role.name,
    hasPassword: user.passwordHash != null,
    hasGoogle: user.googleId != null,
    hasFacebook: user.facebookId != null,
    createdAt: user.createdAt,
  }));
}
