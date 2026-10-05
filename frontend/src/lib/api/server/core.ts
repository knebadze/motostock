import "server-only";
import { cookies, headers as requestHeaders } from "next/headers";
import { apiClient, ApiRequestError } from "../client";
import { forwardedForHeader, getServerApiBaseUrl } from "../internal";

// Shared plumbing for every server-side (SSR) data getter in this folder.

async function authHeaders() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  return cookieHeader ? { Cookie: cookieHeader } : undefined;
}

// Every getXFromServer() in this folder is the same shape: forward the request
// cookie, GET a path, pull one field (or the whole body) out of the
// response, and fall back to a safe empty value on either "not logged in"
// or a request failure — a server component must never throw just because
// a fetch to the API failed. `requireAuth: true` bails out before the
// request entirely for admin/account-only data; omitted (or false) means
// the endpoint is public and should still be attempted without a session
// (see the many per-function comments in the domain files explaining *why* a given
// endpoint needs to stay public — that reasoning lives at each call site,
// not here, since it differs per endpoint).
export async function fetchFromServer<TResponse, TResult>(
  path: string,
  options: {
    params?: Record<string, unknown>;
    fallback: TResult;
    extract: (data: TResponse) => TResult;
    requireAuth?: boolean;
  },
): Promise<TResult> {
  const cookieHeaders = await authHeaders();
  if (options.requireAuth && !cookieHeaders) return options.fallback;
  const headers = {
    ...cookieHeaders,
    ...forwardedForHeader((await requestHeaders()).get("x-forwarded-for")),
  };

  try {
    const { data } = await apiClient.get<TResponse>(path, {
      baseURL: getServerApiBaseUrl(),
      headers,
      params: options.params,
    });
    return options.extract(data);
  } catch (error) {
    // Server components must never throw just because the backend call
    // failed, but silently returning the fallback with zero trace makes a
    // real outage (backend down, DB pool exhausted, timeout) indistinguishable
    // from an ordinary, expected condition — every one of those previously
    // showed up as nothing at all in either the browser console/network tabs
    // (this runs server-side, during SSR) or this terminal. Logged here, not
    // in the axios interceptor, so it carries the actual request path.
    //
    // Only a missing status (the request never got an HTTP response at all —
    // connection refused, timeout, DNS) or a 5xx counts as worth surfacing.
    // Every 4xx is an ordinary application response `requireAuth` callers
    // already expect on every single guest page load (a guest has SOME
    // cookie — locale/theme/guest-id — so `authHeaders()` still sends a
    // Cookie header, and the backend correctly 401s `/users/me` etc. for
    // them) or a deliberate "not found" (e.g. getVacancyBySlugFromServer) —
    // logging those would fire on nearly every request and both drown out
    // the real signal and trip Next.js dev overlay's console.error capture.
    const status = error instanceof ApiRequestError ? error.status : undefined;
    if (status === undefined || status >= 500) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[fetchFromServer] GET ${path} failed${status ? ` (${status})` : ""}: ${message}`);
    }
    return options.fallback;
  }
}

// For the handful of endpoints that are genuinely public with no auth-
// dependent response at all (categories, company-info, faq/public, terms,
// privacy-policy — each confirmed at its own backend route: registered
// before that module's `requireAuth` gate, same response for every caller)
// AND rarely change (admin-edited, not customer actions), so they're worth
// caching across requests, not just within one (see fetchFromServer's own
// per-request-only `cache()` wrapping above). Deliberately does NOT call
// authHeaders()/cookies() — content.ts wraps its callers in unstable_cache,
// and Next.js disallows calling cookies() inside a function cached that way;
// these endpoints never needed the cookie forwarded anyway (unlike
// fetchFromServer's callers, which include admin-only ones sharing this same
// helper's shape).
export async function fetchPublicCacheable<TResponse, TResult>(
  path: string,
  options: { fallback: TResult; extract: (data: TResponse) => TResult },
): Promise<TResult> {
  try {
    // No visitor IP to forward here — this runs inside unstable_cache
    // (shared across visitors, and headers() is disallowed there), so these
    // few calls come from the frontend container itself; at most one per
    // endpoint per PUBLIC_STATIC_CACHE_SECONDS, nowhere near the limit.
    const { data } = await apiClient.get<TResponse>(path, { baseURL: getServerApiBaseUrl() });
    return options.extract(data);
  } catch (error) {
    const status = error instanceof ApiRequestError ? error.status : undefined;
    if (status === undefined || status >= 500) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[fetchPublicCacheable] GET ${path} failed${status ? ` (${status})` : ""}: ${message}`);
    }
    return options.fallback;
  }
}

// 5 minutes — admin-edited content (a category rename, a new FAQ entry, a
// terms update) takes up to this long to show on the storefront instead of
// instantly; there's no Next.js Route Handler in this admin's save path to
// hook an on-demand revalidateTag() into (admin forms write straight to the
// Express backend, not through Next.js), so a short TTL is the safe,
// low-complexity middle ground the alternative (no cross-request caching at
// all) was costing a real backend round-trip for on every single page load.
export const PUBLIC_STATIC_CACHE_SECONDS = 300;

export type AdminListPage<T> = { items: T[]; total: number; page: number; pageSize: number };

export const ADMIN_LIST_INITIAL_PAGE_SIZE = 20;
export const EMPTY_ADMIN_LIST_PAGE = { items: [], total: 0, page: 1, pageSize: ADMIN_LIST_INITIAL_PAGE_SIZE };
