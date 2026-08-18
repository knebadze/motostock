"use client";

import { Select, type SelectOption } from "@/components/shared/Select";
import { ViewModeToggle, type ViewMode } from "./ViewModeToggle";

export function ShopToolbar({
  resultCountLabel,
  sortLabel,
  sortValue,
  sortOptions,
  onSortChange,
  viewMode,
  onViewModeChange,
  gridLabel,
  listLabel,
  filterButtonLabel,
  onFilterClick,
}: {
  resultCountLabel: string;
  // No visible <label> element here (the sort control sits inline in the
  // toolbar, identified only by its selected value) — used as an aria-label
  // instead, since there's nothing for htmlFor to point at.
  sortLabel: string;
  sortValue: string;
  sortOptions: SelectOption[];
  onSortChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  gridLabel: string;
  listLabel: string;
  // Opens FilterDrawer — the filter <aside> next to this toolbar is
  // `hidden` below md:, so small screens need this button as the only way
  // to reach it.
  filterButtonLabel: string;
  onFilterClick: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
      <p className="text-sm text-muted-foreground">{resultCountLabel}</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onFilterClick}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary md:hidden"
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
            <line x1="4" y1="6" x2="20" y2="6" />
            <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
            <line x1="4" y1="18" x2="20" y2="18" />
            <circle cx="11" cy="18" r="2" fill="currentColor" stroke="none" />
          </svg>
          {filterButtonLabel}
        </button>
        <div className="w-48">
          <Select options={sortOptions} value={sortValue} onChange={onSortChange} ariaLabel={sortLabel} />
        </div>
        <ViewModeToggle
          value={viewMode}
          onChange={onViewModeChange}
          gridLabel={gridLabel}
          listLabel={listLabel}
        />
      </div>
    </div>
  );
}
