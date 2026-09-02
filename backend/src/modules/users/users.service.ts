import { ApiError } from "../../lib/ApiError.js";
import { comparePassword, hashPassword } from "../../lib/password.js";
import { toAddressResponse } from "../addresses/addresses.service.js";
import { toResponse as toGarageVehicleResponse } from "../garage/garage.service.js";
import { toResponse as toWishlistItemResponse } from "../wishlist/wishlist.service.js";
import { toResponse as toCartItemResponse } from "../cart/cart.service.js";
import { usersRepository } from "./users.repository.js";
import type { ChangePasswordInput } from "./users.schema.js";

export async function getUserById(id: number) {
  const user = await usersRepository.findById(id);

  if (!user) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  return {
    id: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    createdAt: user.createdAt,
    role: user.role.name,
    emailVerified: user.emailVerifiedAt != null,
  };
}

export async function changePassword(userId: number, input: ChangePasswordInput) {
  const user = await usersRepository.findById(userId);
  if (!user) {
    throw new ApiError(404, "მომხმარებელი ვერ მოიძებნა", "USER_NOT_FOUND");
  }

  if (user.passwordHash) {
    if (!input.currentPassword) {
      throw new ApiError(400, "მიმდინარე პაროლი სავალდებულოა", "CURRENT_PASSWORD_REQUIRED");
    }
    const valid = await comparePassword(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw new ApiError(400, "მიმდინარე პაროლი არასწორია", "CURRENT_PASSWORD_INCORRECT");
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
    addresses: user.addresses.map(toAddressResponse),
    garage: user.garageVehicles.map(toGarageVehicleResponse),
    wishlist: await Promise.all(user.wishlistItems.map(toWishlistItemResponse)),
    cart: user.cartItems.map(toCartItemResponse),
  };
}

// Matches frontend/src/components/shared/Pagination.tsx's DEFAULT_PAGE_SIZE.
const DEFAULT_PAGE_SIZE = 20;

export async function listUsers(search?: string, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const [users, total] = await Promise.all([
    usersRepository.findMany(search, (page - 1) * pageSize, pageSize),
    usersRepository.count(search),
  ]);

  return {
    users: users.map((user) => ({
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role.name,
      hasPassword: user.passwordHash != null,
      hasGoogle: user.googleId != null,
      hasFacebook: user.facebookId != null,
      createdAt: user.createdAt,
    })),
    total,
    page,
    pageSize,
  };
}
