"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { ApiRequestError } from "@/lib/api/client";
import { resolveApiErrorMessage } from "@/lib/api-errors";
import { isKnownAuthState } from "@/lib/api/auth-state";
import { isGuestCartKnownEnabled } from "@/lib/api/guest-feature-state";
import { QuantityStepper } from "@/components/shared/QuantityStepper";
import {
  addToCart,
  getCartStatus,
  removeFromCart,
  updateCartItemQuantity,
  type CartItemType,
} from "@/lib/api/cart";

export function AddToCartButton({
  itemType,
  id,
  stockQuantity,
  disabled = false,
  labelAdd,
  labelAdded,
  labelOutOfStock,
  errorMessage,
  className = "",
}: {
  itemType: CartItemType;
  id: number;
  // Caps the stepper's "+" once already in the cart — same stock ceiling
  // cart.service.ts itself enforces server-side.
  stockQuantity: number;
  disabled?: boolean;
  labelAdd: string;
  labelAdded: string;
  labelOutOfStock: string;
  errorMessage: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const tCart = useTranslations("Cart");
  const tErrors = useTranslations("ApiErrors");
  const [status, setStatus] = useState<"idle" | "loading" | "added">("idle");
  // The cart row's own id + current quantity (not just a boolean) — once
  // set, the button turns into a −/qty/+ stepper instead of "add" — same
  // pattern as WishlistButton's own status lookup.
  const [cartItem, setCartItem] = useState<{ id: number; quantity: number } | null>(null);

  // Resets the stale stepper immediately when the caller switches variants
  // (id changes) — done during render, not the effect below, per React's
  // "adjusting state when a prop changes" pattern.
  const [checkedFor, setCheckedFor] = useState<{ itemType: CartItemType; id: number } | null>(null);
  if (checkedFor?.itemType !== itemType || checkedFor?.id !== id) {
    setCheckedFor({ itemType, id });
    if (cartItem !== null) setCartItem(null);
  }

  useEffect(() => {
    // A logged-out visitor whose session Header already knows isn't
    // authenticated, on a site where the admin hasn't turned on guest cart
    // access, can never get anything but a 401 here — skip the request
    // entirely instead of firing it just to catch that every time.
    if (!isKnownAuthState() && !isGuestCartKnownEnabled()) return;
    let cancelled = false;

    async function checkStatus() {
      try {
        const items =
          itemType === "PRODUCT_VARIANT"
            ? await getCartStatus([id], [])
            : await getCartStatus([], [id]);
        if (!cancelled) {
          setCartItem(items.length > 0 ? { id: items[0].id, quantity: items[0].quantity } : null);
        }
      } catch {
        // Logged-out visitors 401 here when guest cart access is on but
        // this particular visitor has nothing in it yet — the button just
        // starts as "add".
      }
    }

    checkStatus();
    return () => {
      cancelled = true;
    };
  }, [itemType, id]);

  async function handleAdd() {
    if (disabled || status === "loading") return;

    setStatus("loading");
    try {
      const item = await addToCart(
        itemType === "PRODUCT_VARIANT"
          ? { itemType: "PRODUCT_VARIANT", productVariantId: id }
          : { itemType: "VEHICLE_LISTING", vehicleListingId: id },
      );
      setCartItem({ id: item.id, quantity: item.quantity });
      setStatus("added");
      // Refreshes server components (the header's cart-count badge is
      // fetched there) without a full page reload.
      router.refresh();
      setTimeout(() => setStatus("idle"), 2000);
    } catch (error) {
      setStatus("idle");
      if (error instanceof ApiRequestError && error.status === 401) {
        router.push({ pathname: "/login", query: { redirect: pathname } });
        return;
      }
      toast.error(resolveApiErrorMessage(error, tErrors, errorMessage));
    }
  }

  async function handleQuantityChange(nextQuantity: number) {
    if (!cartItem || status === "loading") return;

    setStatus("loading");
    try {
      if (nextQuantity < 1) {
        await removeFromCart(cartItem.id);
        setCartItem(null);
      } else {
        const updated = await updateCartItemQuantity(cartItem.id, nextQuantity);
        setCartItem({ id: updated.id, quantity: updated.quantity });
      }
      router.refresh();
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, tErrors, errorMessage));
    } finally {
      setStatus("idle");
    }
  }

  if (cartItem) {
    return (
      <QuantityStepper
        quantity={cartItem.quantity}
        onDecrease={() => handleQuantityChange(cartItem.quantity - 1)}
        onIncrease={() => handleQuantityChange(cartItem.quantity + 1)}
        decrementDisabled={status === "loading"}
        incrementDisabled={status === "loading" || cartItem.quantity >= stockQuantity}
        decreaseLabel={tCart("decreaseQuantity")}
        increaseLabel={tCart("increaseQuantity")}
        size="lg"
        className={className}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={disabled || status === "loading"}
      className={`rounded-full px-6 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        status === "added"
          ? "bg-green-600 text-white"
          : "bg-primary text-primary-foreground hover:bg-primary-hover"
      } ${className}`}
    >
      {disabled ? labelOutOfStock : status === "added" ? labelAdded : labelAdd}
    </button>
  );
}
