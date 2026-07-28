import { apiClient } from "./client";

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

export async function listUsers(): Promise<AdminUser[]> {
  const { data } = await apiClient.get<{ users: AdminUser[] }>("/users");
  return data.users;
}
