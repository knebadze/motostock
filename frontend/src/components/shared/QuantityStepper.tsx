type QuantityStepperSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<QuantityStepperSize, { container: string; button: string; count: string }> = {
  sm: { container: "gap-1", button: "size-7", count: "w-5 text-xs" },
  md: { container: "gap-1.5", button: "size-8", count: "w-6 text-sm" },
  lg: { container: "gap-1.5", button: "size-9", count: "w-6 text-sm" },
};

// Shared "−, quantity, +" control for adjusting a cart line item's quantity
// (AddToCartButton, CartDropdown, CartManager) — same markup/aria-labels/
// disabled-state shape, previously copy-pasted 3x with only the sizing
// classes differing. Decrement/increment disabling is left to the caller
// (decrementDisabled/incrementDisabled) since the actual rule genuinely
// differs per surface: CartManager (the /cart page) blocks decrementing to
// 0 — the customer uses the explicit, ConfirmDialog-backed "remove" link
// instead — while AddToCartButton/CartDropdown let decrementing to 0 remove
// the row outright, deliberately left unconfirmed for those quicker
// surfaces (see cart_remove_confirmation memory).
export function QuantityStepper({
  quantity,
  onDecrease,
  onIncrease,
  decrementDisabled = false,
  incrementDisabled = false,
  decreaseLabel,
  increaseLabel,
  size = "md",
  className = "",
}: {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
  decrementDisabled?: boolean;
  incrementDisabled?: boolean;
  decreaseLabel: string;
  increaseLabel: string;
  size?: QuantityStepperSize;
  className?: string;
}) {
  const sizeClasses = SIZE_CLASSES[size];

  return (
    <div
      className={`flex items-center rounded-full border border-border ${sizeClasses.container} ${className}`}
    >
      <button
        type="button"
        onClick={onDecrease}
        disabled={decrementDisabled}
        aria-label={decreaseLabel}
        className={`flex items-center justify-center text-foreground transition-colors hover:text-primary disabled:opacity-40 ${sizeClasses.button}`}
      >
        −
      </button>
      <span className={`text-center font-medium ${sizeClasses.count}`}>{quantity}</span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={incrementDisabled}
        aria-label={increaseLabel}
        className={`flex items-center justify-center text-foreground transition-colors hover:text-primary disabled:opacity-40 ${sizeClasses.button}`}
      >
        +
      </button>
    </div>
  );
}
