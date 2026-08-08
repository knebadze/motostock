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

export async function listUsers(): Promise<AdminUser[]> {
  const { data } = await apiClient.get<{ users: AdminUser[] }>("/users");
  return data.users;
}

export async function getUser(id: number): Promise<AdminUserDetail> {
  const { data } = await apiClient.get<{ user: AdminUserDetail }>(`/users/${id}`);
  return data.user;
}
