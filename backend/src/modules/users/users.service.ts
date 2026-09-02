import { ApiError } from "../../lib/ApiError.js";
import { comparePassword, hashPassword } from "../../lib/password.js";
import { resolvePage } from "../../lib/pagination.js";
import { signJwt } from "../../lib/jwt.js";
import type { RoleName } from "../../lib/roles.js";
import { toAddressResponse } from "../addresses/addresses.service.js";
import { toResponse as toGarageVehicleResponse } from "../garage/garage.service.js";
import { toResponse as toWishlistItemResponse } from "../wishlist/wishlist.service.js";
import { toResponse as toCartItemResponse } from "../cart/cart.service.js";
import { usersRepository } from "./users.repository.js";
import type { ChangePasswordInput, ListUsersQuery } from "./users.schema.js";

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

// Returns a freshly-signed token for the caller's OWN session — updatePasswordHash
// bumps User.tokenVersion, which invalidates every *other* session/device the
// next time each one is used (see auth.middleware.ts's resolveAuthenticatedUser),
// but the session making this exact request needs a token that already
// carries the new version, or its own next request would log itself out too.
// loginAt is passed in (from the caller's current, already-verified token)
// rather than reset to now — this is a mid-session cookie reissue, not a new
// login, so the absolute session cap keeps measuring from the true start.
export async function changePassword(
  userId: number,
  input: ChangePasswordInput,
  loginAt: number,
): Promise<string> {
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
  const updated = await usersRepository.updatePasswordHash(userId, passwordHash);

  return signJwt({
    sub: updated.id,
    role: updated.role.name as RoleName,
    loginAt,
    tokenVersion: updated.tokenVersion,
  });
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

export async function listUsers(query: ListUsersQuery) {
  const { page, pageSize, skip, take } = resolvePage(query);

  const [users, total] = await Promise.all([
    usersRepository.findMany(query.q, skip, take),
    usersRepository.count(query.q),
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
