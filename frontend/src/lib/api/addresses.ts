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

export async function getMyAddress(): Promise<Address | null> {
  const { data } = await apiClient.get<{ address: Address | null }>("/users/me/address");
  return data.address;
}

export async function saveMyAddress(input: AddressInput): Promise<Address> {
  const { data } = await apiClient.put<{ address: Address }>("/users/me/address", input);
  return data.address;
}
