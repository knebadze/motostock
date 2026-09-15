import { apiClient } from "./client";

export type CollectionImage = {
  id: number;
  imageUrl: string;
  position: number;
};

// Shared by product-variant-images.ts and vehicle-listing-images.ts, whose
// list/upload/reorder/delete image-gallery API used to be implemented
// twice, byte-for-byte identical apart from the URL base and the parent-id
// param name (variantId vs listingId).
export function createImageCollectionApi(basePath: (parentId: number) => string) {
  async function list(parentId: number): Promise<CollectionImage[]> {
    const { data } = await apiClient.get<{ items: CollectionImage[] }>(basePath(parentId));
    return data.items;
  }

  async function upload(parentId: number, files: File[]): Promise<CollectionImage[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));

    const { data } = await apiClient.post<{ items: CollectionImage[] }>(basePath(parentId), formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.items;
  }

  async function reorder(parentId: number, imageIds: number[]): Promise<CollectionImage[]> {
    const { data } = await apiClient.put<{ items: CollectionImage[] }>(
      `${basePath(parentId)}/order`,
      { imageIds },
    );
    return data.items;
  }

  async function remove(parentId: number, imageId: number): Promise<void> {
    await apiClient.delete(`${basePath(parentId)}/${imageId}`);
  }

  return { list, upload, reorder, remove };
}
