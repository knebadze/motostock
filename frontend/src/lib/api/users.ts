import { apiClient } from "./client";
import type { components } from "./generated/schema";
import type { ApiResponse } from "./generated-helpers";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type AdminUser = Schemas["AdminUser"];

export type AdminUserDetail = Schemas["AdminUserDetail"];

export type AdminUsersPage = ApiResponse<"/users", "get">;

export type ListUsersFilters = {
  search?: string;
  role?: "USER" | "ADMIN" | "OPERATOR";
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

export type CreateWalkInUserInput = Schemas["CreateWalkInUserInput"];

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

// The only way to grant/revoke OPERATOR (or promote/demote ADMIN) — no
// self-registration path ever produces anything but "USER".
export async function updateUserRole(
  id: number,
  role: "USER" | "ADMIN" | "OPERATOR",
): Promise<AdminUser> {
  const { data } = await apiClient.patch<{ user: AdminUser }>(`/users/${id}/role`, { role });
  return data.user;
}
