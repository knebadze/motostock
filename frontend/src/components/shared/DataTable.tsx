"use client";

import type { ReactNode } from "react";

export type DataTableColumn<T> = {
  header: string;
  render: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
};

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  emptyMessage,
  actions,
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string | number;
  emptyMessage: string;
  actions?: (row: T) => ReactNode;
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* True table — md and up. Below md this used to just scroll
          horizontally, which made it impossible to see e.g. buyer+status+
          amount together on one screen; hidden entirely in favor of the
          stacked cards below instead. */}
      <div className="hidden overflow-x-auto rounded-2xl border border-border md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((column, index) => (
                <th key={index} className={`px-4 py-3 font-medium ${column.headerClassName ?? ""}`}>
                  {column.header}
                </th>
              ))}
              {actions && <th className="px-4 py-3 font-medium text-right">მოქმედება</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={getRowKey(row)} className="border-b border-border last:border-0">
                {columns.map((column, index) => (
                  <td key={index} className={`px-4 py-3 ${column.cellClassName ?? ""}`}>
                    {column.render(row)}
                  </td>
                ))}
                {actions && <td className="px-4 py-3">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stacked cards — below md. Every column becomes a labeled row inside
          one card per record, so every field a column carries stays visible
          without horizontal scrolling, on the same data/columns/actions props
          every DataTable caller already passes — no per-screen changes
          needed to get this. */}
      <ul className="flex flex-col gap-3 md:hidden">
        {data.map((row) => (
          <li key={getRowKey(row)} className="rounded-2xl border border-border p-4">
            <dl className="flex flex-col gap-2">
              {columns.map((column, index) => (
                <div key={index} className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 pt-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {column.header}
                  </dt>
                  <dd className={`text-right text-sm text-foreground ${column.cellClassName ?? ""}`}>
                    {column.render(row)}
                  </dd>
                </div>
              ))}
            </dl>
            {actions && (
              <div className="mt-3 flex justify-end border-t border-border pt-3">{actions(row)}</div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
