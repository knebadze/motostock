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
const siteIsHttps = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");

// OPERATOR is a limited staff/cashier role — view-only across products/
// vehicle-listings/service-history/fina-sync, plus order status changes.
// Checked here (middleware), not via a headers()-forwarded pathname read in
// app/admin/(protected)/layout.tsx — an earlier version tried that and hit a
// real bug: the forwarded pathname wasn't reliably visible to the layout,
// so every OPERATOR page load fell through to "not allowed" and redirected
// to /admin/orders — including requests already AT /admin/orders, which
// re-ran the same broken check on itself and looped forever. Middleware has
// `request.nextUrl.pathname` directly, with no round-trip to get wrong.
const OPERATOR_ALLOWED_PATHS = new Set([
  "/admin",
  "/admin/analytics",
  "/admin/products",
  "/admin/vehicle-listings",
  "/admin/service-history",
  "/admin/fina-sync",
  "/admin/orders",
  "/admin/users",
  "/admin/bulk-discounts",
  "/admin/promo-codes",
  "/admin/compatibility",
  "/admin/buy-together",
  "/admin/change-password",
]);
const OPERATOR_DEFAULT_PATH = "/admin";

// Only called for /admin/* paths outside OPERATOR_ALLOWED_PATHS — an ADMIN
// hitting one of those pays this extra request too (middleware can't know
// the role without asking), but every OPERATOR-reachable page skips it
// entirely, and this backend call is the same "who is this cookie" lookup
// app/admin/(protected)/layout.tsx already makes on its own via
// getCurrentUserFromServer(), just moved earlier so it can gate before the
// page starts rendering instead of after.
async function isOperatorSession(request: NextRequest): Promise<boolean> {
  const cookie = request.headers.get("cookie");
  if (!cookie) return false;

  try {
    const response = await fetch(`${apiOrigin}/api/users/me`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { user?: { role?: string } };
    return body.user?.role === "OPERATOR";
  } catch {
    return false;
  }
}

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
  // Gated on the site's own declared scheme (the same NEXT_PUBLIC_SITE_URL
  // DEPLOY.md has the admin set per phase), not NODE_ENV — production still
  // means plain HTTP during DEPLOY.md's initial IP-only test phase (no
  // domain/TLS yet), and forcing an https upgrade there breaks every _next/
  // static/font/image request exactly like it would against the local dev
  // backend (a real incident: 2026-09-16, deployed to a bare-IP Caddy
  // instance with no :443 listener — every static asset came back
  // ERR_CONNECTION_REFUSED because the browser dutifully upgraded them).
  if (siteIsHttps) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export default async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const cspHeader = buildCspHeader(nonce);

  // Mutated in place (not a copy) so next-intl's own middleware — which
  // builds `new Headers(request.headers)` internally when it forwards the
  // request — picks these up too, without needing to know about them.
  request.headers.set("x-nonce", nonce);
  request.headers.set("Content-Security-Policy", cspHeader);

  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/admin") &&
    pathname !== "/admin/login" &&
    !OPERATOR_ALLOWED_PATHS.has(pathname) &&
    (await isOperatorSession(request))
  ) {
    return NextResponse.redirect(new URL(OPERATOR_DEFAULT_PATH, request.url));
  }

  // /admin isn't locale-routed (see i18n/routing.ts) and used to be excluded
  // from this proxy's matcher entirely — now included so it gets the same
  // CSP, but passed straight through instead of into next-intl's locale
  // resolution, which knows nothing about /admin.
  const response = pathname.startsWith("/admin")
    ? NextResponse.next({ request: { headers: request.headers } })
    : intlMiddleware(request);

  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
