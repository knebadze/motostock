import { ApiError } from "../../lib/ApiError.js";
import { comparePassword, hashPassword } from "../../lib/password.js";
import { signJwt } from "../../lib/jwt.js";
import { ROLES, type RoleName } from "../../lib/roles.js";
import { usersRepository } from "../users/users.repository.js";
import { rolesRepository } from "../roles/roles.repository.js";
import type { LoginInput, RegisterInput } from "./auth.schema.js";

function toSafeUser(user: {
  id: number;
  email: string;
  name: string;
  role: { name: string };
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role.name,
    createdAt: user.createdAt,
  };
}

export async function registerUser(input: RegisterInput) {
  const existing = await usersRepository.findByEmail(input.email);
  if (existing) {
    throw new ApiError(409, "Email already in use");
  }

  const userRole = await rolesRepository.findByName(ROLES.USER);
  if (!userRole) {
    throw new ApiError(500, "Default role is not configured");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await usersRepository.create({
    email: input.email,
    name: input.name,
    passwordHash,
    roleId: userRole.id,
  });

  const token = signJwt({ sub: user.id, role: ROLES.USER });
  return { user: toSafeUser(user), token };
}

export async function loginUser(input: LoginInput) {
  const user = await usersRepository.findByEmail(input.email);
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = signJwt({ sub: user.id, role: user.role.name as RoleName });
  return { user: toSafeUser(user), token };
}
