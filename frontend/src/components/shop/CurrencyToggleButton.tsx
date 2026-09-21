"use client";

import type { VehicleListingCurrency } from "@/lib/api/vehicle-listings";

// Shows the destination currency's own symbol (₾/$) rather than an abstract
// swap icon — immediately legible as "click to see the price in this
// currency" without relying on an icon convention the shopper has to learn.
export function CurrencyToggleButton({
  onClick,
  disabled,
  label,
  targetCurrency,
  className,
}: {
  onClick: (event: React.MouseEvent) => void;
  disabled?: boolean;
  label: string;
  targetCurrency: VehicleListingCurrency;
  className?: string;
}) {
  const symbol = targetCurrency === "USD" ? "$" : "₾";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-border px-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 ${className ?? ""}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-3"
      >
        <path d="M17 3 21 7l-4 4" />
        <path d="M3 7h18" />
        <path d="M7 21 3 17l4-4" />
        <path d="M21 17H3" />
      </svg>
      {symbol}
    </button>
  );
}
