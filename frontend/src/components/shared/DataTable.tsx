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
  const columnCount = columns.length + (actions ? 1 : 0);

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
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
          {data.length === 0 && (
            <tr>
              <td colSpan={columnCount} className="px-4 py-8 text-center text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          )}
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
  );
}
