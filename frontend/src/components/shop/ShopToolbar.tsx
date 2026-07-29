"use client";

import { Select, type SelectOption } from "@/components/shared/Select";
import { ViewModeToggle, type ViewMode } from "./ViewModeToggle";

export function ShopToolbar({
  resultCountLabel,
  sortValue,
  sortOptions,
  onSortChange,
  viewMode,
  onViewModeChange,
  gridLabel,
  listLabel,
}: {
  resultCountLabel: string;
  sortValue: string;
  sortOptions: SelectOption[];
  onSortChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  gridLabel: string;
  listLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
      <p className="text-sm text-muted-foreground">{resultCountLabel}</p>
      <div className="flex items-center gap-3">
        <div className="w-48">
          <Select options={sortOptions} value={sortValue} onChange={onSortChange} />
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
