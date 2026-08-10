import { apiClient } from "./client";
import type { LocalizedString } from "./categories";

export type HomepageProductSliderType = "DISCOUNTED" | "POPULAR";

export type HomepageProductSlider = {
  id: number;
  type: HomepageProductSliderType;
  title: LocalizedString;
  isActive: boolean;
  sortOrder: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type HomepageProductSliderInput = {
  title?: LocalizedString;
  isActive?: boolean;
  sortOrder?: number;
  itemCount?: number;
};

export async function listHomepageProductSliders(): Promise<HomepageProductSlider[]> {
  const { data } = await apiClient.get<{ items: HomepageProductSlider[] }>("/homepage-product-sliders");
  return data.items;
}

export async function listPublicHomepageProductSliders(): Promise<HomepageProductSlider[]> {
  const { data } = await apiClient.get<{ items: HomepageProductSlider[] }>(
    "/homepage-product-sliders/public",
  );
  return data.items;
}

export async function updateHomepageProductSlider(
  id: number,
  input: HomepageProductSliderInput,
): Promise<HomepageProductSlider> {
  const { data } = await apiClient.patch<{ item: HomepageProductSlider }>(
    `/homepage-product-sliders/${id}`,
    input,
  );
  return data.item;
}
