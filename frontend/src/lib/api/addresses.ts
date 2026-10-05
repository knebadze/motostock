import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type Address = Schemas["Address"];

export type AddressInput = Schemas["CreateAddressInput"];

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
