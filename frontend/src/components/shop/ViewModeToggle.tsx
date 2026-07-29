"use client";

export type ViewMode = "grid" | "list";

export function ViewModeToggle({
  value,
  onChange,
  gridLabel,
  listLabel,
}: {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  gridLabel: string;
  listLabel: string;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border p-1">
      <button
        type="button"
        aria-pressed={value === "grid"}
        aria-label={gridLabel}
        onClick={() => onChange("grid")}
        className={`flex size-8 items-center justify-center rounded-full transition-colors ${
          value === "grid"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
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
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </button>
      <button
        type="button"
        aria-pressed={value === "list"}
        aria-label={listLabel}
        onClick={() => onChange("list")}
        className={`flex size-8 items-center justify-center rounded-full transition-colors ${
          value === "list"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
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
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>
  );
}
