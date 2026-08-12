import { apiClient } from "./client";

// Backs RichTextEditor's image toolbar button — not tied to any entity, so
// it lives on its own instead of alongside a specific module's API client.
export async function uploadRichTextImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);

  const { data } = await apiClient.post<{ url: string }>("/media/rich-text-image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.url;
}
