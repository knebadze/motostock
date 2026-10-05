// Mirrors client-side list state (page, sort, ...) into the address bar
// WITHOUT a navigation. The shop pages used router.replace() for this, which
// on these dynamic routes triggers a full server re-render (RSC refetch of
// categories, products, facets, filters, garage) — on every page load (the
// sync effect also runs on mount) and again on every page/sort change, on
// top of the client fetch that already loaded the data. Next.js integrates
// with the native History API, so useSearchParams() etc. stay in sync.
//
// `null` removes a key; keys not mentioned (e.g. utm_* params) are kept.
// No-op when nothing would change.
export function replaceUrlQueryParams(updates: Record<string, string | null>) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(updates)) {
    if (value == null) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  if (url.href === window.location.href) return;
  window.history.replaceState(window.history.state, "", url);
}
