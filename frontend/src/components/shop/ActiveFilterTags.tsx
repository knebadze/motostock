"use client";

export type ActiveFilterTag = { key: string; label: string; onRemove: () => void };

// Sits at the top of the filter fields — rendered once inside the shared
// `filterFields` node each shop page builds, so it shows up identically in
// both the desktop <aside> and the mobile FilterDrawer (see
// FilterDrawer.tsx) without being wired up twice.
export function ActiveFilterTags({
  tags,
  onClearAll,
  clearAllLabel,
}: {
  tags: ActiveFilterTag[];
  onClearAll: () => void;
  clearAllLabel: string;
}) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-b border-border pb-4">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag.key}
            className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
          >
            {tag.label}
            <button
              type="button"
              onClick={tag.onRemove}
              aria-label={tag.label}
              className="text-primary/70 hover:text-primary"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={onClearAll}
        className="self-start text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
      >
        {clearAllLabel}
      </button>
    </div>
  );
}
