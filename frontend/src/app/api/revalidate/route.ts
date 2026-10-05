import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUserFromServer } from "@/lib/api/server";

// Lets the admin panel force an instant refresh of the handful of
// unstable_cache-wrapped public endpoints (getCategoriesFromServer/
// getCompanyInfoFromServer/getTermsFromServer/getPrivacyPolicyFromServer/
// getFaqListFromServer — see lib/api/server.ts's PUBLIC_STATIC_CACHE_SECONDS
// comment) right after an admin save, instead of making every visitor wait
// out the 5-minute TTL. There's no Next.js Server Action/Route Handler in
// the admin save path itself to hook revalidateTag() into directly — admin
// forms write straight to the Express backend, not through Next.js — so
// this is a thin dedicated endpoint the admin UI calls as a second step
// right after a successful save (see each admin manager's own call site).
const REVALIDATABLE_TAGS = ["categories", "company-info", "terms", "privacy-policy", "faq-public"] as const;
type RevalidatableTag = (typeof REVALIDATABLE_TAGS)[number];

function isRevalidatableTag(value: unknown): value is RevalidatableTag {
  return typeof value === "string" && (REVALIDATABLE_TAGS as readonly string[]).includes(value);
}

export async function POST(request: NextRequest) {
  // Proxies the browser's own session cookie to the real backend (via
  // getCurrentUserFromServer, same as any server component) rather than a
  // shared secret — this is only ever called from the admin panel, which
  // already has a real admin session, so reusing that is simpler than
  // minting and distributing a separate secret to the client bundle.
  const user = await getCurrentUserFromServer();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const tag = (body as { tag?: unknown } | null)?.tag;
  if (!isRevalidatableTag(tag)) {
    return NextResponse.json({ error: "Unknown tag" }, { status: 400 });
  }

  // `{ expire: 0 }` — Next 16's revalidateTag requires a second "cacheLife
  // profile" argument now; 0 means "treat this tag's cached entries as
  // already expired", i.e. exactly the on-demand immediate-refresh behavior
  // this endpoint exists for.
  revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ revalidated: true, tag });
}
