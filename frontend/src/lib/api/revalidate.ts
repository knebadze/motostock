// Calls this app's own /api/revalidate Route Handler (not the Express
// backend) right after an admin save, so the public cross-request cache on
// the corresponding getXFromServer() in lib/api/server/content.ts (categories,
// company-info, terms, privacy-policy, faq-public) drops immediately instead
// of waiting out its TTL (see PUBLIC_STATIC_CACHE_SECONDS there).
export type RevalidatableTag = "categories" | "company-info" | "terms" | "privacy-policy" | "faq-public";

export async function revalidatePublicCache(tag: RevalidatableTag): Promise<void> {
  try {
    await fetch("/api/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag }),
    });
  } catch {
    // Best-effort — a failed call just means the 5-minute TTL catches up on
    // its own; never block or surface an error for the admin's own save,
    // which already succeeded by the time this runs.
  }
}
