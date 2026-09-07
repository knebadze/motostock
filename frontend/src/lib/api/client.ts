import axios, { type AxiosError } from "axios";
import { routing } from "@/i18n/routing";
import { notifySessionLoss } from "./session-loss";
import { isKnownAuthState } from "./auth-state";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  // Axios's default array serialization is `key[]=1&key[]=2` — Express 5
  // (this backend) defaults to the "simple" query parser (plain
  // node:querystring, not qs), which reads that literally as one key named
  // "key[]" instead of an array under "key". `indexes: null` switches to
  // bare repeated keys (`key=1&key=2`), which node:querystring does collect
  // into an array — required for every array-valued query param (brandIds, etc).
  paramsSerializer: { indexes: null },
});

export const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/api\/?$/, "");

export function resolveMediaUrl(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path) || path.startsWith("blob:")) return path;
  return `${API_ORIGIN}${path}`;
}

type ApiErrorPayload = {
  error: {
    message: string;
    code?: string;
    params?: Record<string, string | number>;
    details?: { path: string; message: string }[];
  };
};

export class ApiRequestError extends Error {
  status?: number;
  // Stable identifier (e.g. "OUT_OF_STOCK") the backend attaches to
  // customer-facing errors — see lib/api-errors.ts's
  // resolveApiErrorMessage, which maps this to a translated message instead
  // of `message` (always Georgian, backend has no locale awareness).
  // Undefined for network/parse failures that never reached the backend,
  // and for older/admin-only errors that don't set one yet.
  code?: string;
  // ICU placeholder values for the translated message (e.g. { limit: 4 }) —
  // only meaningful alongside `code`.
  params?: Record<string, string | number>;
  details?: { path: string; message: string }[];

  constructor(
    message: string,
    status?: number,
    details?: { path: string; message: string }[],
    code?: string,
    params?: Record<string, string | number>,
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.details = details;
    this.code = code;
    this.params = params;
  }
}

// Endpoints whose OWN 401 means "the credentials in this one request were
// wrong," not "your already-established session died" — must be excluded
// below, or a failed login attempt (bad password) would immediately bounce
// the visitor off the very form that's showing them why it failed. One
// shared /auth/login route serves both the customer and admin login forms
// (see fraud.service.ts's account-lockout guard, which covers both the same
// way), so a single entry here covers both.
const AUTH_ENDPOINTS_WITH_EXPECTED_401 = ["/auth/login"];

// Computes the right login page for wherever the browser currently is —
// admin panel vs. the locale-prefixed customer site — carrying the current
// path so the login form can return the visitor to it afterward (same
// `redirect` query param convention AddToCartButton.tsx/WishlistButton.tsx/
// BuyTogether.tsx already use for their own local 401 handling). Handed off
// to session-loss.ts's notifySessionLoss rather than navigated to directly:
// this runs inside an axios interceptor, not a React render, so there's no
// framework router instance available here regardless of which page
// triggered it — SessionLossRedirector.tsx supplies one.
function redirectToLoginOnSessionLoss() {
  if (typeof window === "undefined") return;
  const { pathname } = window.location;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return;
    notifySessionLoss(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
    return;
  }

  const firstSegment = pathname.split("/").filter(Boolean)[0];
  const locale = routing.locales.includes(firstSegment as (typeof routing.locales)[number])
    ? firstSegment
    : routing.defaultLocale;
  const loginPath = `/${locale}/login`;
  if (pathname === loginPath) return;
  notifySessionLoss(`${loginPath}?redirect=${encodeURIComponent(pathname)}`);
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    const message =
      error.response?.data?.error?.message ?? error.message ?? "Unexpected error";
    const details = error.response?.data?.error?.details;
    const code = error.response?.data?.error?.code;
    const params = error.response?.data?.error?.params;

    // Session-revocation safety net: before this, only 3 hand-picked
    // components (cart/wishlist/buy-together) redirected on a 401 — every
    // other authenticated call site (all ~40 admin Manager components
    // included) just surfaced a generic "failed to load/save" toast forever
    // on a revoked session (logged out on another device, a password change
    // elsewhere bumping tokenVersion, the 30-day absolute cap, or an
    // explicit server-side session revocation — see session.repository.ts),
    // with no path back to actually logging in again.
    //
    // Gated on isKnownAuthState() — without it, this fired on every guest's
    // 401 from an optional-auth endpoint too (e.g. WishlistButton's
    // wishlist-status check on every product card, which deliberately 401s
    // and silently no-ops for a logged-out visitor), yanking guests who
    // were never logged in off to the login page. See auth-state.ts.
    const url = error.config?.url ?? "";
    if (
      error.response?.status === 401 &&
      isKnownAuthState() &&
      !AUTH_ENDPOINTS_WITH_EXPECTED_401.some((path) => url.startsWith(path))
    ) {
      redirectToLoginOnSessionLoss();
    }

    return Promise.reject(
      new ApiRequestError(message, error.response?.status, details, code, params),
    );
  },
);
