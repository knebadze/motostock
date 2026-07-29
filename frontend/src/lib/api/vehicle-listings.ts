import { apiClient } from "./client";
import type { NamedRef } from "./vehicle-catalog";
import type { LookupItem } from "./lookups";
import type { VehicleListingDiscount } from "./vehicle-listing-discounts";
import type { VehicleListingImage } from "./vehicle-listing-images";

export type VehicleListing = {
  id: number;
  vehicleCatalog: {
    id: number;
    category: NamedRef;
    brand: NamedRef;
    model: NamedRef;
    yearFrom: number | null;
    yearTo: number | null;
    imageUrl: string | null;
  };
  condition: LookupItem;
  status: LookupItem;
  color: LookupItem;
  year: number;
  isActive: boolean;
  price: number;
  stockQuantity: number;
  descriptionKa: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
  images: VehicleListingImage[];
  discounts: VehicleListingDiscount[];
  activeDiscount: VehicleListingDiscount | null;
  createdAt: string;
  updatedAt: string;
};

export type VehicleListingInput = {
  vehicleCatalogId: number;
  conditionId: number;
  statusId: number;
  colorId: number;
  year: number;
  isActive?: boolean;
  price: number;
  stockQuantity?: number;
  descriptionKa?: string | null;
  descriptionEn?: string | null;
  descriptionRu?: string | null;
};

export async function listVehicleListings(categoryId?: number): Promise<VehicleListing[]> {
  const { data } = await apiClient.get<{ items: VehicleListing[] }>("/vehicle-listings", {
    params: categoryId ? { categoryId } : undefined,
  });
  return data.items;
}

export async function createVehicleListing(
  input: VehicleListingInput,
): Promise<VehicleListing> {
  const { data } = await apiClient.post<{ item: VehicleListing }>("/vehicle-listings", input);
  return data.item;
}

export async function updateVehicleListing(
  id: number,
  input: Partial<VehicleListingInput>,
): Promise<VehicleListing> {
  const { data } = await apiClient.patch<{ item: VehicleListing }>(
    `/vehicle-listings/${id}`,
    input,
  );
  return data.item;
}

export async function deleteVehicleListing(id: number): Promise<void> {
  await apiClient.delete(`/vehicle-listings/${id}`);
}
