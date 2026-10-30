import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Personal data self-service (backend account-data.service.ts): profile
// edit, consent, data export, account deletion.
export type Profile = components["schemas"]["Profile"];

export async function updateProfile(input: {
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
}): Promise<Profile> {
  const { data } = await apiClient.patch<{ profile: Profile }>("/users/me/profile", input);
  return data.profile;
}

export async function acceptConsents(): Promise<Profile> {
  const { data } = await apiClient.post<{ profile: Profile }>("/users/me/consents");
  return data.profile;
}

// Plain link (the browser downloads the attachment with the session cookie).
export function getMyDataExportUrl(): string {
  return `${apiClient.defaults.baseURL}/users/me/export`;
}

export async function deleteMyAccount(input: { password?: string; confirmEmail?: string }): Promise<{
  anonymized: boolean;
}> {
  const { data } = await apiClient.delete<{ anonymized: boolean }>("/users/me", { data: input });
  return data;
}
