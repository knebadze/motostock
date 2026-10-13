"use client";

import { useState, useRef } from "react";
import { usePathname } from "next/navigation";

// Server-side pagination companion to usePagination above — use this one
// when the backend does the skip/take (see backend/src/lib/pagination.ts's
// resolvePage) and responds with {items,total,page,pageSize}; use
// usePagination instead when the full array is already in memory and
// slicing happens in the browser. Centralizes the
// state+totalPages+loading/error boilerplate that was previously
// copy-pasted into every admin Manager (and would otherwise be copy-pasted
// into every storefront list too) — callers still write their own fetcher
// (each module's filters differ) but hand it to `load` instead of
// reimplementing the try/finally/setData dance themselves.
export type PagedResult<T> = { items: T[]; total: number; page: number; pageSize: number };

export function useServerPagination<T>(initialData: PagedResult<T>) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  // Only the LATEST load may apply its result: with debounced search,
  // a slow response for "hon" could otherwise land after the one for
  // "honda" (or a page click during a filter fetch) and overwrite it.
  const latestRequestRef = useRef(0);

  async function load(fetcher: () => Promise<PagedResult<T>>, onError?: (error: unknown) => void) {
    const requestId = ++latestRequestRef.current;
    setLoading(true);
    try {
      const result = await fetcher();
      if (requestId === latestRequestRef.current) setData(result);
    } catch (error) {
      if (requestId === latestRequestRef.current) onError?.(error);
    } finally {
      if (requestId === latestRequestRef.current) setLoading(false);
    }
  }

  return { data, setData, totalPages, loading, load };
}

const DEFAULT_PAGE_SIZE = 20;

// Shared client-side pagination: slices an already-fetched array, clamping
// the requested page to the valid range so a shrinking list (e.g. after a
// delete or a filter change) never strands the view on an empty page.
export function usePagination<T>(items: T[], pageSize: number = DEFAULT_PAGE_SIZE, initialPage: number = 1) {
  const [page, setPage] = useState(initialPage);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const pageItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return { page: currentPage, setPage, pageItems, totalPages };
}

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  const delta = 1;
  const middle: number[] = [];
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
    middle.push(i);
  }

  const pages: (number | "ellipsis")[] = [1];
  if (middle[0] > 2) pages.push("ellipsis");
  pages.push(...middle);
  if (middle[middle.length - 1] < total - 1) pages.push("ellipsis");
  if (total > 1) pages.push(total);
  return pages;
}

// Builds the href of each page link for a public, crawlable list — the
// current path plus the list's URL state (sort, event, ...), page omitted
// for page 1 so it matches that page's canonical URL. `null`/`undefined`
// values are left out.
export function usePageHref(query: Record<string, string | null | undefined>): (page: number) => string {
  const pathname = usePathname();
  return (page: number) => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== "") params.set(key, value);
    }
    const queryString = params.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  };
}

const ARROW_CLASS =
  "flex size-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary-text";
const ARROW_DISABLED_CLASS = "pointer-events-none opacity-40";

function pageNumberClass(isCurrent: boolean) {
  return `flex size-9 items-center justify-center rounded-full text-sm font-medium transition-colors ${
    isCurrent ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
  }`;
}

function ArrowIcon({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d={direction === "prev" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

// One control: a link when hrefs are available, a button otherwise.
function Control({
  page,
  getPageHref,
  onPageChange,
  disabled,
  className,
  ariaLabel,
  ariaCurrent,
  children,
}: {
  page: number;
  getPageHref?: (page: number) => string;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className: string;
  ariaLabel?: string;
  ariaCurrent?: "page";
  children: React.ReactNode;
}) {
  if (!getPageHref) {
    return (
      <button
        type="button"
        onClick={() => onPageChange(page)}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-current={ariaCurrent}
        className={`${className} disabled:pointer-events-none disabled:opacity-40`}
      >
        {children}
      </button>
    );
  }
  if (disabled) {
    return (
      <span aria-label={ariaLabel} aria-disabled="true" className={`${className} ${ARROW_DISABLED_CLASS}`}>
        {children}
      </span>
    );
  }
  return (
    <a
      href={getPageHref(page)}
      data-no-progress
      onClick={(event) => {
        // Let the browser handle "open in new tab/window" gestures.
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onPageChange(page);
      }}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      className={className}
    >
      {children}
    </a>
  );
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  getPageHref,
  navLabel = "გვერდები",
  prevLabel = "წინა გვერდი",
  nextLabel = "შემდეგი გვერდი",
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  // Public lists pass this (see usePageHref): the controls then render as
  // real <a href> links crawlers can follow to page 2+ — a plain click still
  // loads the page in place via onPageChange (same look, same behavior);
  // ctrl/cmd/middle-click opens the URL like any link. Without it (admin
  // tables), they stay buttons.
  getPageHref?: (page: number) => string;
  // Georgian defaults match the admin panel's untranslated copy —
  // storefront callers pass next-intl-translated overrides.
  navLabel?: string;
  prevLabel?: string;
  nextLabel?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-4 flex items-center justify-center gap-1.5" aria-label={navLabel}>
      <Control
        page={currentPage - 1}
        getPageHref={getPageHref}
        onPageChange={onPageChange}
        disabled={currentPage === 1}
        className={ARROW_CLASS}
        ariaLabel={prevLabel}
      >
        <ArrowIcon direction="prev" />
      </Control>

      {getPageNumbers(currentPage, totalPages).map((page, index) =>
        page === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="px-1 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <Control
            key={page}
            page={page}
            getPageHref={getPageHref}
            onPageChange={onPageChange}
            className={pageNumberClass(page === currentPage)}
            ariaCurrent={page === currentPage ? "page" : undefined}
          >
            {page}
          </Control>
        ),
      )}

      <Control
        page={currentPage + 1}
        getPageHref={getPageHref}
        onPageChange={onPageChange}
        disabled={currentPage === totalPages}
        className={ARROW_CLASS}
        ariaLabel={nextLabel}
      >
        <ArrowIcon direction="next" />
      </Control>
    </nav>
  );
}
