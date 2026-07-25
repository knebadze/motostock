import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../lib/ApiError.js";
import { comparePassword, hashPassword } from "../../lib/password.js";
import { signJwt } from "../../lib/jwt.js";
import { ROLES, type RoleName } from "../../lib/roles.js";
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
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError(409, "Email already in use");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      role: { connect: { name: ROLES.USER } },
    },
    include: { role: true },
  });

  const token = signJwt({ sub: user.id, role: ROLES.USER });
  return { user: toSafeUser(user), token };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { role: true },
  });
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
