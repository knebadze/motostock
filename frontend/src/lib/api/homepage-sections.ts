import { apiClient } from "./client";
import type { LocalizedString } from "./categories";

export type HomepageSectionType =
  | "DISCOUNTED_PRODUCTS"
  | "POPULAR_PRODUCTS"
  | "DISCOUNTED_VEHICLES"
  | "POPULAR_VEHICLES"
  | "CATEGORIES";

export type HomepageSection = {
  id: number;
  type: HomepageSectionType;
  title: LocalizedString;
  isActive: boolean;
  sortOrder: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type HomepageSectionInput = {
  title?: LocalizedString;
  isActive?: boolean;
  sortOrder?: number;
  itemCount?: number;
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
