"use client";

import { useState } from "react";

const DEFAULT_PAGE_SIZE = 20;

// Shared client-side pagination: slices an already-fetched array, clamping
// the requested page to the valid range so a shrinking list (e.g. after a
// delete or a filter change) never strands the view on an empty page.
export function usePagination<T>(
  items: T[],
  pageSize: number = DEFAULT_PAGE_SIZE,
  initialPage: number = 1,
) {
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

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-4 flex items-center justify-center gap-1.5" aria-label="გვერდები">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="წინა გვერდი"
        className="flex size-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
      >
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
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      {getPageNumbers(currentPage, totalPages).map((page, index) =>
        page === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="px-1 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? "page" : undefined}
            className={`flex size-9 items-center justify-center rounded-full text-sm font-medium transition-colors ${
              page === currentPage
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-muted"
            }`}
          >
            {page}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="შემდეგი გვერდი"
        className="flex size-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
      >
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
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </nav>
  );
}
