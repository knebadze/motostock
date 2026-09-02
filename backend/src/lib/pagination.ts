// Shared page/pageSize -> skip/take resolution, used by every server-paginated
// list endpoint (admin lists, and the storefront product/vehicle-listing
// browse+search lists) so the "page defaults to 1, pageSize defaults to N,
// pageSize is capped" arithmetic lives in exactly one place instead of being
// copy-pasted per module.
export type PageQuery = { page?: number; pageSize?: number };

export type ResolvedPage = { page: number; pageSize: number; skip: number; take: number };

const MAX_PAGE_SIZE = 100;

export function resolvePage(query: PageQuery, defaultPageSize = 20): ResolvedPage {
  const page = query.page ?? 1;
  const pageSize = Math.min(query.pageSize ?? defaultPageSize, MAX_PAGE_SIZE);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
