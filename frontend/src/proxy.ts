import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const isDev = process.env.NODE_ENV === "development";

// Same origin-derivation as next.config.ts's resolveApiOrigin and
// lib/api/client.ts's resolveMediaUrl — the backend serves both the API
// itself (connect-src) and disk-stored /uploads images (img-src) from this
// origin, a different one than the frontend, so 'self' doesn't cover it.
function resolveApiOrigin(): string {
  try {
    return new URL((process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/api\/?$/, "")).origin;
  } catch {
    return "http://localhost:4000";
  }
}

const apiOrigin = resolveApiOrigin();

// A fresh nonce per request lets script-src stay strict (block arbitrary
// inline/external script injection) while still allowing the specific
// inline scripts this app legitimately renders: next-themes' pre-hydration
// snippet (RootShell.tsx) and the JSON-LD structured-data blocks
// (components/shared/JsonLd.tsx), each of which reads this same nonce back
// off the `x-nonce` request header this proxy sets below. 'strict-dynamic'
// means browsers that support nonces ignore host-based script-src entries
// entirely (only nonce/hash matter), so no script host allowlist is needed.
function buildCspHeader(nonce: string): string {
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Inline style="" attributes are pervasive (chart widths, computed
    // dropdown offsets, the hero background-image) and can't practically be
    // nonced the way <script> tags can — CSS alone can't execute script, so
    // 'unsafe-inline' here is the standard, low-risk trade-off a strict CSP
    // makes for style-src.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: ${apiOrigin} https://res.cloudinary.com`,
    `font-src 'self'`,
    `connect-src 'self' ${apiOrigin}`,
    // The contact page's embedded store-location map (app/[locale]/(guest)/
    // contact/page.tsx).
    `frame-src https://www.google.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ];
  // Upgrading to https would break the plain-http local backend in dev.
  if (!isDev) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export default function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const cspHeader = buildCspHeader(nonce);

  // Mutated in place (not a copy) so next-intl's own middleware — which
  // builds `new Headers(request.headers)` internally when it forwards the
  // request — picks these up too, without needing to know about them.
  request.headers.set("x-nonce", nonce);
  request.headers.set("Content-Security-Policy", cspHeader);

  // /admin isn't locale-routed (see i18n/routing.ts) and used to be excluded
  // from this proxy's matcher entirely — now included so it gets the same
  // CSP, but passed straight through instead of into next-intl's locale
  // resolution, which knows nothing about /admin.
  const response = request.nextUrl.pathname.startsWith("/admin")
    ? NextResponse.next({ request: { headers: request.headers } })
    : intlMiddleware(request);

  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
