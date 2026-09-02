import { apiClient } from "./client";
import type { Address } from "./addresses";
import type { GarageVehicle } from "./vehicle-catalog";
import type { WishlistItem } from "./wishlist";
import type { CartItem } from "./cart";

export type AdminUser = {
  id: number;
  email: string;
  name: string;
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

// Real server-side pagination (skip/take), like error-logs — the user base
// only grows, so fetching everyone up front and slicing client-side doesn't
// scale (see users.repository.ts's findMany).
export async function listUsers(
  search?: string,
  page = 1,
  pageSize = 20,
): Promise<AdminUsersPage> {
  const { data } = await apiClient.get<AdminUsersPage>("/users", {
    params: { q: search || undefined, page, pageSize },
  });
  return data;
}

export async function getUser(id: number): Promise<AdminUserDetail> {
  const { data } = await apiClient.get<{ user: AdminUserDetail }>(`/users/${id}`);
  return data.user;
}
