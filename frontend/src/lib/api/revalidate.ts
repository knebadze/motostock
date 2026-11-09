// Calls this app's own /api/revalidate Route Handler (not the Express
// backend) right after an admin save, so the public cross-request cache on
// the corresponding getXFromServer() in lib/api/server/content.ts (categories,
// company-info, terms, privacy-policy, faq-public, vehicle-catalog) drops immediately instead
// of waiting out its TTL (see PUBLIC_STATIC_CACHE_SECONDS there).
export type RevalidatableTag =
  | "categories"
  | "company-info"
  | "terms"
  | "privacy-policy"
  | "faq-public"
  | "shipping-policy"
  | "delivery-info"
  | "vehicle-catalog"
  | "service-types-public"
  | "guest-feature-status"
  // Every public cache at once — the admin "clear cache" action.
  | "all";

// Resolves to whether the revalidation went through. Never throws: the
// admin's own save already succeeded by the time this runs. Most tags have
// a short TTL that catches up on its own; "categories" doesn't expire, so
// its caller warns the admin when this returns false.
export async function revalidatePublicCache(tag: RevalidatableTag): Promise<boolean> {
  try {
    const response = await fetch("/api/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
