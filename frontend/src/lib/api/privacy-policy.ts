import { apiClient } from "./client";
import type { LocalizedString } from "./categories";

export type PrivacyPolicy = {
  id: number;
  content: LocalizedString;
  updatedAt: string;
};

export type UpdatePrivacyPolicyInput = {
  content: LocalizedString;
};

export async function getPrivacyPolicy(): Promise<PrivacyPolicy> {
  const { data } = await apiClient.get<{ privacyPolicy: PrivacyPolicy }>("/privacy-policy");
  return data.privacyPolicy;
}

export async function updatePrivacyPolicy(input: UpdatePrivacyPolicyInput): Promise<PrivacyPolicy> {
  const { data } = await apiClient.patch<{ privacyPolicy: PrivacyPolicy }>("/privacy-policy", input);
  return data.privacyPolicy;
}
