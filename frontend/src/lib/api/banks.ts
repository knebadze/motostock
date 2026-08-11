import { apiClient } from "./client";
import type { LocalizedString } from "./categories";

export type Bank = {
  id: number;
  key: string;
  name: LocalizedString;
  logoUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  supportsInstallment: boolean;
  supportsSplitPayment: boolean;
  credentials: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
};

// The checkout page's shape — never carries credentials (see
// banks.service.ts's toPublicResponse on the backend).
export type PublicBank = {
  id: number;
  key: string;
  name: LocalizedString;
  logoUrl: string | null;
};

export type BankInput = {
  key: string;
  name: LocalizedString;
  isActive?: boolean;
  supportsInstallment?: boolean;
  supportsSplitPayment?: boolean;
  credentials?: Record<string, string> | null;
};

export async function listBanks(): Promise<Bank[]> {
  const { data } = await apiClient.get<{ items: Bank[] }>("/banks");
  return data.items;
}

export async function listPublicBanks(): Promise<PublicBank[]> {
  const { data } = await apiClient.get<{ items: PublicBank[] }>("/banks/public");
  return data.items;
}

export async function createBank(input: BankInput): Promise<Bank> {
  const { data } = await apiClient.post<{ item: Bank }>("/banks", input);
  return data.item;
}

export async function updateBank(id: number, input: Partial<BankInput>): Promise<Bank> {
  const { data } = await apiClient.patch<{ item: Bank }>(`/banks/${id}`, input);
  return data.item;
}

export async function uploadBankLogo(id: number, file: File): Promise<Bank> {
  const formData = new FormData();
  formData.append("logo", file);

  const { data } = await apiClient.post<{ item: Bank }>(`/banks/${id}/logo`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.item;
}

export async function reorderBanks(ids: number[]): Promise<Bank[]> {
  const { data } = await apiClient.put<{ items: Bank[] }>("/banks/order", { ids });
  return data.items;
}

export async function deleteBank(id: number): Promise<void> {
  await apiClient.delete(`/banks/${id}`);
}
