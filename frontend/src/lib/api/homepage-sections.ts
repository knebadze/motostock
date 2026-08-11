import { apiClient } from "./client";
import type { LocalizedString } from "./categories";

export type HomepageSectionType =
  | "DISCOUNTED_PRODUCTS"
  | "POPULAR_PRODUCTS"
  | "DISCOUNTED_VEHICLES"
  | "POPULAR_VEHICLES"
  | "DISCOUNTED_MIXED"
  | "POPULAR_MIXED"
  | "CATEGORIES"
  | "POPULAR_FOR_VEHICLE"
  | "RECOMMENDED_FOR_YOU"
  | "RECENTLY_VIEWED";

export type HomepageSection = {
  id: number;
  type: HomepageSectionType;
  title: LocalizedString;
  isActive: boolean;
  sortOrder: number;
  itemCount: number;
  // Only set for DISCOUNTED_MIXED/POPULAR_MIXED — those combine products
  // and vehicle listings in one carousel and need separate counts instead
  // of the shared itemCount above.
  productItemCount: number | null;
  vehicleItemCount: number | null;
  createdAt: string;
  updatedAt: string;
};

export type HomepageSectionInput = {
  title?: LocalizedString;
  isActive?: boolean;
  sortOrder?: number;
  itemCount?: number;
  productItemCount?: number;
  vehicleItemCount?: number;
};

export async function listHomepageSections(): Promise<HomepageSection[]> {
  const { data } = await apiClient.get<{ items: HomepageSection[] }>("/homepage-sections");
  return data.items;
}

export async function listPublicHomepageSections(): Promise<HomepageSection[]> {
  const { data } = await apiClient.get<{ items: HomepageSection[] }>("/homepage-sections/public");
  return data.items;
}

export async function updateHomepageSection(
  id: number,
  input: HomepageSectionInput,
): Promise<HomepageSection> {
  const { data } = await apiClient.patch<{ item: HomepageSection }>(
    `/homepage-sections/${id}`,
    input,
  );
  return data.item;
}
