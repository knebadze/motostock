import { ApiError } from "../../lib/ApiError.js";
import { comparePassword, hashPassword } from "../../lib/password.js";
import { toAddressResponse } from "../addresses/addresses.service.js";
import { toVehicleCatalogResponse } from "../vehicle-catalog/vehicle-catalog.service.js";
import { usersRepository } from "./users.repository.js";
import type { ChangePasswordInput } from "./users.schema.js";

export async function getUserById(id: number) {
  const user = await usersRepository.findById(id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return {
    id: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    createdAt: user.createdAt,
    role: user.role.name,
  };
}

export async function changePassword(userId: number, input: ChangePasswordInput) {
  const user = await usersRepository.findById(userId);
  if (!user) {
    throw new ApiError(404, "მომხმარებელი ვერ მოიძებნა");
  }

  if (user.passwordHash) {
    if (!input.currentPassword) {
      throw new ApiError(400, "მიმდინარე პაროლი სავალდებულოა");
    }
    const valid = await comparePassword(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw new ApiError(400, "მიმდინარე პაროლი არასწორია");
    }
  }

  const passwordHash = await hashPassword(input.newPassword);
  await usersRepository.updatePasswordHash(userId, passwordHash);
}

export async function getUserDetail(id: number) {
  const user = await usersRepository.findByIdWithDetails(id);
  if (!user) {
    throw new ApiError(404, "მომხმარებელი ვერ მოიძებნა");
  }

  return {
    id: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    role: user.role.name,
    hasPassword: user.passwordHash != null,
    hasGoogle: user.googleId != null,
    hasFacebook: user.facebookId != null,
    createdAt: user.createdAt,
    address: user.address ? toAddressResponse(user.address) : null,
    garage: user.garageVehicles.map((vehicle) => ({
      id: vehicle.id,
      year: vehicle.year,
      vehicleCatalog: toVehicleCatalogResponse(vehicle.vehicleCatalog),
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
    })),
  };
}

export async function listUsers() {
  const users = await usersRepository.findMany();

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    role: user.role.name,
    hasPassword: user.passwordHash != null,
    hasGoogle: user.googleId != null,
    hasFacebook: user.facebookId != null,
    createdAt: user.createdAt,
  }));
}
