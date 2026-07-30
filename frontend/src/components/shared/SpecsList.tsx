"use client";

import { useState } from "react";

export type SpecRow = { label: string; value: string };

// Collapses to roughly the gallery image's visual height so a long spec
// list doesn't tower over it — "View all" reveals the rest, "Collapse"
// puts it back.
const COLLAPSED_ROW_COUNT = 8;

export function SpecsList({
  rows,
  showAllLabel,
  collapseLabel,
}: {
  rows: SpecRow[];
  showAllLabel: string;
  collapseLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = rows.length > COLLAPSED_ROW_COUNT;
  const visibleRows = expanded ? rows : rows.slice(0, COLLAPSED_ROW_COUNT);

  return (
    <div className="flex flex-col gap-3">
      <dl className="flex flex-col gap-2">
        {visibleRows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 border-b border-border py-1.5 text-sm"
          >
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-medium text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="self-start text-sm font-semibold text-primary hover:underline"
        >
          {expanded ? collapseLabel : showAllLabel}
        </button>
      )}
    </div>
  );
}
