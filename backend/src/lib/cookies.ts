import { env } from "../config/env.js";

// `Secure` cookies are silently dropped by the browser on a plain-HTTP
// origin — keying this off NODE_ENV alone breaks any cookie-based flow on a
// production deploy that's still on IP+HTTP (no domain/TLS yet, see
// DEPLOY.md's two-phase rollout): the request that sets the cookie succeeds,
// but nothing ever gets stored, so every subsequent request looks like it
// never happened. Deriving it from BACKEND_PUBLIC_URL instead means it
// tracks the real protocol — off during the HTTP test phase, on
// automatically once that's updated to `https://` for the real domain
// (already a required edit at that point regardless).
//
// Shared by every cookie this backend sets (auth — lib/jwt.ts, OAuth state —
// oauth.controller.ts, guest id — guest-identity.middleware.ts) — the auth
// cookie was fixed first (commit 953cc0b) but the other two kept their own
// NODE_ENV-based copy, which meant OAuth login and guest cart/wishlist/
// compare silently stopped working during the exact same HTTP-only rollout
// phase the auth-cookie fix was meant to survive.
export const COOKIE_SECURE = (env.BACKEND_PUBLIC_URL ?? "").startsWith("https://");
