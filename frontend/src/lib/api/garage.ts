import { apiClient } from "./client";
import type { GarageVehicle } from "./vehicle-catalog";

export type { GarageVehicle } from "./vehicle-catalog";

export type GarageVehicleInput = {
  vehicleCatalogId: number;
  year: number;
};

export async function listMyGarage(): Promise<GarageVehicle[]> {
  const { data } = await apiClient.get<{ items: GarageVehicle[] }>("/users/me/garage");
  return data.items;
}

export async function createGarageVehicle(input: GarageVehicleInput): Promise<GarageVehicle> {
  const { data } = await apiClient.post<{ item: GarageVehicle }>("/users/me/garage", input);
  return data.item;
}

export async function updateGarageVehicle(
  id: number,
  input: GarageVehicleInput,
): Promise<GarageVehicle> {
  const { data } = await apiClient.patch<{ item: GarageVehicle }>(
    `/users/me/garage/${id}`,
    input,
  );
  return data.item;
}

export async function deleteGarageVehicle(id: number): Promise<void> {
  await apiClient.delete(`/users/me/garage/${id}`);
}
