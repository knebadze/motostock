import type { ReactNode } from "react";
import type { ViewMode } from "./ViewModeToggle";

export function ShopItemGrid<T>({
  items,
  layout,
  renderItem,
  emptyMessage,
  getKey,
}: {
  items: T[];
  layout: ViewMode;
  renderItem: (item: T, layout: ViewMode) => ReactNode;
  emptyMessage: string;
  getKey: (item: T) => number | string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={
        layout === "grid"
          ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          : "flex flex-col gap-4"
      }
    >
      {items.map((item) => (
        <div key={getKey(item)}>{renderItem(item, layout)}</div>
      ))}
    </div>
  );
}
