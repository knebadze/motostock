import "server-only";
import { cookies } from "next/headers";
import { apiClient } from "./client";
import type { User } from "./auth";

export async function getCurrentUserFromServer(): Promise<User | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  if (!cookieHeader) {
    return null;
  }

  try {
    const { data } = await apiClient.get<{ user: User }>("/users/me", {
      headers: { Cookie: cookieHeader },
    });
    return data.user;
  } catch {
    return null;
  }
}
