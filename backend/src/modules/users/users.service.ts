import { ApiError } from "../../lib/ApiError.js";
import { comparePassword, hashPassword } from "../../lib/password.js";
import { resolvePage } from "../../lib/pagination.js";
import { signJwt } from "../../lib/jwt.js";
import { isUniqueConstraintViolation } from "../../lib/prismaErrors.js";
import { ROLES, type RoleName } from "../../lib/roles.js";
import { toAddressResponse } from "../addresses/addresses.service.js";
import { toResponse as toGarageVehicleResponse } from "../garage/garage.service.js";
import { garageRepository } from "../garage/garage.repository.js";
import { toResponse as toWishlistItemResponse } from "../wishlist/wishlist.service.js";
import { toResponse as toCartItemResponse } from "../cart/cart.service.js";
import { sessionRepository } from "../auth/session.repository.js";
import { rolesRepository } from "../roles/roles.repository.js";
import { usersRepository } from "./users.repository.js";
import type {
  ChangePasswordInput,
  CreateWalkInUserInput,
  ListUsersQuery,
  UpdateUserRoleInput,
} from "./users.schema.js";

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

function toAdminUserSummary(user: {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  dateOfBirth: Date | null;
  isWalkIn: boolean;
  mergedIntoUserId: number | null;
  role: { name: string };
  passwordHash: string | null;
  googleId: string | null;
  facebookId: string | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    phone: user.phone,
    dateOfBirth: user.dateOfBirth,
    isWalkIn: user.isWalkIn,
    mergedIntoUserId: user.mergedIntoUserId,
    role: user.role.name,
    hasPassword: user.passwordHash != null,
    hasGoogle: user.googleId != null,
    hasFacebook: user.facebookId != null,
    createdAt: user.createdAt,
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
  sessionId: number,
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

  // Every other device's Session row is now permanently unusable (its next
  // request fails the tokenVersion check regardless) — delete them here
  // instead of leaving them to accumulate as dead entries on the admin
  // "active sessions" page. This one (sessionId) survives — it's getting a
  // freshly re-signed cookie below, not being replaced.
  await sessionRepository.deleteAllForUserExcept(userId, sessionId);

  return signJwt({
    sub: updated.id,
    role: updated.role.name as RoleName,
    loginAt,
    tokenVersion: updated.tokenVersion,
    sessionId,
  });
}

export async function getUserDetail(id: number) {
  const user = await usersRepository.findByIdWithDetails(id);
  if (!user) {
    throw new ApiError(404, "მომხმარებელი ვერ მოიძებნა");
  }

  return {
    ...toAdminUserSummary(user),
    addresses: user.addresses.map(toAddressResponse),
    garage: user.garageVehicles.map(toGarageVehicleResponse),
    wishlist: await Promise.all(user.wishlistItems.map(toWishlistItemResponse)),
    cart: await Promise.all(user.cartItems.map(toCartItemResponse)),
  };
}

export async function listUsers(query: ListUsersQuery) {
  const { page, pageSize, skip, take } = resolvePage(query);
  const filters = { search: query.q, role: query.role, customerType: query.customerType };

  const [users, total] = await Promise.all([
    usersRepository.findMany(filters, skip, take),
    usersRepository.count(filters),
  ]);

  return {
    users: users.map(toAdminUserSummary),
    total,
    page,
    pageSize,
  };
}

// Admin workshop "+ ახალი სტუმარი მომხმარებელი" action — creates a real User
// row with no login (synthetic email, no password), so garage/service-record
// creation can attach to a real id right away. Converted in place (not
// replaced) the moment a matching registration arrives — see
// auth.service.ts's registerUser.
export async function createWalkInUser(input: CreateWalkInUserInput) {
  const existingPhone = await usersRepository.findByPhone(input.phone);
  if (existingPhone) {
    throw new ApiError(409, "ამ ტელეფონის ნომრით მომხმარებელი უკვე არსებობს", "PHONE_ALREADY_IN_USE");
  }

  const userRole = await rolesRepository.findByName(ROLES.USER);
  if (!userRole) {
    throw new ApiError(500, "Default role is not configured", "INTERNAL_CONFIG_ERROR");
  }

  try {
    const user = await usersRepository.createWalkIn({
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      dateOfBirth: new Date(input.dateOfBirth),
      roleId: userRole.id,
    });
    return toAdminUserSummary(user);
  } catch (err) {
    if (!isUniqueConstraintViolation(err, "phone")) throw err;
    throw new ApiError(409, "ამ ტელეფონის ნომრით მომხმარებელი უკვე არსებობს", "PHONE_ALREADY_IN_USE");
  }
}

// Admin manual-merge fallback — for two already-separate rows (a walk-in W
// and a real account R the admin knows are the same person) that the
// automatic phone-match couldn't connect on its own (e.g. W's phone differs
// from R's, or R signed up via Google/Facebook, which collects no phone at
// all). W is kept, not deleted (no delete-user feature exists) — just
// flagged so the admin list can show "შერწყმულია".
export async function mergeUserInto(fromUserId: number, targetUserId: number) {
  if (fromUserId === targetUserId) {
    throw new ApiError(400, "მომხმარებლის თავად თავისთან შერწყმა შეუძლებელია", "MERGE_SAME_USER");
  }

  const [fromUser, targetUser] = await Promise.all([
    usersRepository.findById(fromUserId),
    usersRepository.findById(targetUserId),
  ]);
  if (!fromUser || !targetUser) {
    throw new ApiError(404, "მომხმარებელი ვერ მოიძებნა", "USER_NOT_FOUND");
  }
  if (fromUser.mergedIntoUserId != null) {
    throw new ApiError(400, "მომხმარებელი უკვე შერწყმულია", "USER_ALREADY_MERGED");
  }
  if (targetUser.mergedIntoUserId != null) {
    throw new ApiError(400, "სამიზნე მომხმარებელი უკვე შერწყმულია სხვასთან", "TARGET_USER_ALREADY_MERGED");
  }

  await garageRepository.reassignOwner(fromUserId, targetUserId);
  const updated = await usersRepository.setMergedInto(fromUserId, targetUserId);
  return toAdminUserSummary(updated);
}

// The only way to grant/revoke OPERATOR (or promote/demote ADMIN) — no
// self-registration path ever produces anything but ROLES.USER. Blocks
// changing the caller's own role so an admin can't accidentally lock
// themselves out of the panel with no other admin left to undo it.
export async function updateUserRole(id: number, callerId: number, input: UpdateUserRoleInput) {
  if (id === callerId) {
    throw new ApiError(400, "საკუთარი როლის შეცვლა შეუძლებელია", "CANNOT_CHANGE_OWN_ROLE");
  }

  const user = await usersRepository.findById(id);
  if (!user) {
    throw new ApiError(404, "მომხმარებელი ვერ მოიძებნა", "USER_NOT_FOUND");
  }

  const role = await rolesRepository.findByName(input.role);
  if (!role) {
    throw new ApiError(500, "როლი კონფიგურირებული არ არის", "ROLE_NOT_CONFIGURED");
  }

  const updated = await usersRepository.updateRole(id, role.id);
  return toAdminUserSummary(updated);
}
