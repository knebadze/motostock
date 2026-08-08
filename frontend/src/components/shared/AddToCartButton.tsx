"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { ApiRequestError } from "@/lib/api/client";
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
        // Logged-out visitors 401 here — the button just starts as "add".
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
      toast.error(error instanceof ApiRequestError ? error.message : errorMessage);
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
      toast.error(error instanceof ApiRequestError ? error.message : errorMessage);
    } finally {
      setStatus("idle");
    }
  }

  if (cartItem) {
    return (
      <div
        className={`flex items-center gap-1.5 rounded-full border border-border ${className}`}
      >
        <button
          type="button"
          onClick={() => handleQuantityChange(cartItem.quantity - 1)}
          disabled={status === "loading"}
          aria-label={tCart("decreaseQuantity")}
          className="flex size-9 items-center justify-center text-foreground transition-colors hover:text-primary disabled:opacity-40"
        >
          −
        </button>
        <span className="w-6 text-center text-sm font-medium">{cartItem.quantity}</span>
        <button
          type="button"
          onClick={() => handleQuantityChange(cartItem.quantity + 1)}
          disabled={status === "loading" || cartItem.quantity >= stockQuantity}
          aria-label={tCart("increaseQuantity")}
          className="flex size-9 items-center justify-center text-foreground transition-colors hover:text-primary disabled:opacity-40"
        >
          +
        </button>
      </div>
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
