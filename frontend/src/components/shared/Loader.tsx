const SIZE_CLASSES = {
  xs: "size-3",
  sm: "size-4",
  md: "size-5",
  lg: "size-8",
} as const;

// Inherits the surrounding text color (currentColor) so it drops into any
// button/text context — primary-foreground inside a filled button, muted
// text inline, etc. — without a color prop to keep in sync.
export function Loader({
  size = "sm",
  className = "",
}: {
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  return (
    <svg
      className={`animate-spin ${SIZE_CLASSES[size]} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="status"
      aria-label="იტვირთება"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
