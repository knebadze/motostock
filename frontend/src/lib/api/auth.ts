import { apiClient } from "./client";

export type User = {
  id: number;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
  createdAt: string;
};

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  const { data } = await apiClient.post<{ user: User }>("/auth/register", input);
  return data.user;
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<User> {
  const { data } = await apiClient.post<{ user: User }>("/auth/login", input);
  return data.user;
}

export async function logoutUser(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<{ user: User }>("/users/me");
  return data.user;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiClient.post("/auth/forgot-password", { email });
}

export async function resetPassword(token: string, password: string): Promise<User> {
  const { data } = await apiClient.post<{ user: User }>("/auth/reset-password", {
    token,
    password,
  });
  return data.user;
}
