import { apiClient } from "./client";
import type { LookupItem } from "./lookups";

export type Address = {
  id: number;
  phone: string;
  city: LookupItem;
  street: string;
  building: string | null;
  apartment: string | null;
  postalCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AddressInput = {
  phone: string;
  cityId: number;
  street: string;
  building?: string | null;
  apartment?: string | null;
  postalCode?: string | null;
};

export async function listMyAddresses(): Promise<Address[]> {
  const { data } = await apiClient.get<{ addresses: Address[] }>("/users/me/addresses");
  return data.addresses;
}

export async function createMyAddress(input: AddressInput): Promise<Address> {
  const { data } = await apiClient.post<{ address: Address }>("/users/me/addresses", input);
  return data.address;
}

export async function updateMyAddress(id: number, input: AddressInput): Promise<Address> {
  const { data } = await apiClient.patch<{ address: Address }>(
    `/users/me/addresses/${id}`,
    input,
  );
  return data.address;
}

export async function deleteMyAddress(id: number): Promise<void> {
  await apiClient.delete(`/users/me/addresses/${id}`);
}
