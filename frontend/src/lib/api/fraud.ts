import { apiClient } from "./client";

export type SuspiciousLoginActivity = {
  windowMinutes: number;
  threshold: number;
  byEmail: { email: string; count: number }[];
  byIp: { ipAddress: string; count: number }[];
};

export async function getSuspiciousLoginActivity(): Promise<SuspiciousLoginActivity> {
  const { data } = await apiClient.get<SuspiciousLoginActivity>("/fraud/suspicious-logins");
  return data;
}
