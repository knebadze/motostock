// Base URL for API calls made from the Next.js server (SSR in lib/api/server.ts,
// proxy.ts's admin role check) — never from the browser. In Docker this is
// INTERNAL_API_URL (http://backend:4000/api, see docker-compose.yml), so SSR
// talks to the backend container directly over the compose network instead
// of hairpinning out through the public URL and Caddy. Not NEXT_PUBLIC_, so
// it's read at runtime on the server and never inlined into a client bundle.
// Unset (local dev) falls back to the public URL, which is already direct.
export function getServerApiBaseUrl(): string | undefined {
  return process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL;
}

// Server-side calls otherwise all arrive at the backend from this one
// frontend container's address, so every visitor's SSR reads would share a
// single per-IP rate-limit bucket (globalReadRateLimit) — at modest traffic
// that bucket 429s and fetchFromServer silently renders empty fallbacks.
// Forwarding the visitor's X-Forwarded-For lets the backend's `trust proxy 1`
// resolve req.ip to the real visitor, exactly as if the browser had called
// it through Caddy itself. Passed through verbatim (not just one entry) so
// the backend applies the same "rightmost hop" rule it applies to Caddy's
// own requests. Only trustworthy because the frontend container publishes
// no port — every request reaching Next.js came through Caddy, which
// overwrites any client-supplied X-Forwarded-For.
export function forwardedForHeader(forwardedFor: string | null): Record<string, string> {
  return forwardedFor ? { "X-Forwarded-For": forwardedFor } : {};
}
