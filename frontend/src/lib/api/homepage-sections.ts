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

// Swaps this section's sortOrder with its up/down neighbor atomically in
// one backend transaction (see homepage-sections.service.ts's
// moveHomepageSection) — used instead of two independent
// updateHomepageSection calls, which previously reordered the UI's two
// rows client-side and PATCHed them separately with no shared transaction,
// so a failure between the two requests (or a concurrent edit landing in
// between) could leave both rows holding the same sortOrder. Returns the
// full, freshly-reordered list so the caller can just replace its state.
export async function moveHomepageSection(
  id: number,
  direction: "up" | "down",
): Promise<HomepageSection[]> {
  const { data } = await apiClient.post<{ items: HomepageSection[] }>(
    `/homepage-sections/${id}/move`,
    { direction },
  );
  return data.items;
}
