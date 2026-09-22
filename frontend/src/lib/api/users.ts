import { apiClient } from "./client";
import type { Address } from "./addresses";
import type { GarageVehicle } from "./vehicle-catalog";
import type { WishlistItem } from "./wishlist";
import type { CartItem } from "./cart";

export type AdminUser = {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  dateOfBirth: string | null;
  // A workshop-entered customer with no login of their own.
  isWalkIn: boolean;
  // Set once an admin manually links this (walk-in) row onto a real
  // account — the row is kept, not deleted, and stays visible in the list.
  mergedIntoUserId: number | null;
  role: "USER" | "ADMIN";
  hasPassword: boolean;
  hasGoogle: boolean;
  hasFacebook: boolean;
  createdAt: string;
};

export type AdminUserDetail = AdminUser & {
  addresses: Address[];
  garage: GarageVehicle[];
  wishlist: WishlistItem[];
  cart: CartItem[];
};

export type AdminUsersPage = {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
};

export type ListUsersFilters = {
  search?: string;
  role?: "USER" | "ADMIN";
  // Mirrors the admin list's own badges (see UsersManager.tsx): WALK_IN is
  // isWalkIn regardless of merge status, REGISTERED is !isWalkIn, MERGED is
  // mergedIntoUserId set.
  customerType?: "WALK_IN" | "REGISTERED" | "MERGED";
  page?: number;
  pageSize?: number;
};

// Real server-side pagination (skip/take), like error-logs — the user base
// only grows, so fetching everyone up front and slicing client-side doesn't
// scale (see users.repository.ts's findMany).
export async function listUsers(filters: ListUsersFilters = {}): Promise<AdminUsersPage> {
  const { search, page = 1, pageSize = 20, ...rest } = filters;
  const { data } = await apiClient.get<AdminUsersPage>("/users", {
    params: { q: search || undefined, page, pageSize, ...rest },
  });
  return data;
}

export async function getUser(id: number): Promise<AdminUserDetail> {
  const { data } = await apiClient.get<{ user: AdminUserDetail }>(`/users/${id}`);
  return data.user;
}

export type CreateWalkInUserInput = {
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
};

// Workshop "+ ახალი სტუმარი მომხმარებელი" action — creates a real User row
// with no login (synthetic email, no password); it converts in place the
// moment the same phone number registers for real (see auth.service.ts's
// registerUser).
export async function createWalkInUser(input: CreateWalkInUserInput): Promise<AdminUser> {
  const { data } = await apiClient.post<{ user: AdminUser }>("/users/walk-in", input);
  return data.user;
}

// Admin manual-merge fallback — for two already-separate rows (typically a
// walk-in and a real account) the automatic phone-match on registration
// couldn't connect on its own.
export async function mergeUserInto(id: number, targetUserId: number): Promise<AdminUser> {
  const { data } = await apiClient.post<{ user: AdminUser }>(
    `/users/${id}/merge-into/${targetUserId}`,
  );
  return data.user;
}
