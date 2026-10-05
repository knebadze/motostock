"use client";

import type { ReactNode } from "react";
import { toTbilisiDateOnly } from "@/lib/format";

// Table/summary building blocks shared by the product and vehicle-listing
// candidate lists (ProductDiscountCandidates / VehicleDiscountCandidates) —
// only their columns and filters differ.

export type CandidateColumn<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  muted?: boolean;
};

type ActiveDiscount = { discountPercent: number | null; endDate: string } | null;

export function ActiveDiscountBadge({ discount }: { discount: ActiveDiscount }) {
  if (!discount) return <>—</>;
  return (
    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-400">
      {discount.discountPercent != null ? `${discount.discountPercent}%` : "აქტიური"} →{" "}
      {toTbilisiDateOnly(discount.endDate)}
    </span>
  );
}

export function CandidateSelectionSummary({
  shownCount,
  totalCount,
  noun,
  selectedCount,
  onSelectVisible,
  onDeselectVisible,
  onClear,
}: {
  shownCount: number;
  totalCount: number;
  // e.g. "ვარიანტი" / "განცხადება"
  noun: string;
  selectedCount: number;
  onSelectVisible: () => void;
  onDeselectVisible: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>
        ნაჩვენებია {shownCount} / {totalCount} {noun} — მონიშნულია{" "}
        <span className="font-semibold text-foreground">{selectedCount}</span>
      </span>
      <div className="flex gap-3 text-xs">
        <button type="button" onClick={onSelectVisible} className="text-primary-text hover:underline">
          ხილულის მონიშვნა
        </button>
        <button type="button" onClick={onDeselectVisible} className="text-muted-foreground hover:underline">
          ხილულის მოხსნა
        </button>
        <button type="button" onClick={onClear} className="text-muted-foreground hover:underline">
          მთლიანად გასუფთავება
        </button>
      </div>
    </div>
  );
}

export function CandidateTable<T>({
  rows,
  getId,
  columns,
  selectedIds,
  onToggle,
  emptyMessage,
}: {
  rows: T[];
  getId: (row: T) => number;
  columns: CandidateColumn<T>[];
  selectedIds: Set<number>;
  onToggle: (id: number, checked: boolean) => void;
  emptyMessage: string;
}) {
  return (
    <div className="max-h-[32rem] overflow-auto rounded-2xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 border-b border-border bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
          <tr>
            <th className="px-3 py-2" />
            {columns.map((column) => (
              <th key={column.header} className="px-3 py-2 font-medium">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          )}
          {rows.map((row) => {
            const id = getId(row);
            return (
              <tr key={id} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(id)}
                    onChange={(event) => onToggle(id, event.target.checked)}
                    className="size-4 rounded border-border accent-primary"
                  />
                </td>
                {columns.map((column) => (
                  <td
                    key={column.header}
                    className={`px-3 py-2 ${column.muted ? "text-muted-foreground" : ""}`}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
