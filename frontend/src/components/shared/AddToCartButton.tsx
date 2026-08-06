"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { ApiRequestError } from "@/lib/api/client";
import { addToCart, type CartItemType } from "@/lib/api/cart";

export function AddToCartButton({
  itemType,
  id,
  disabled = false,
  labelAdd,
  labelAdded,
  labelOutOfStock,
  errorMessage,
  className = "",
}: {
  itemType: CartItemType;
  id: number;
  disabled?: boolean;
  labelAdd: string;
  labelAdded: string;
  labelOutOfStock: string;
  errorMessage: string;
  className?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "added">("idle");

  async function handleClick() {
    if (disabled || status === "loading") return;

    setStatus("loading");
    try {
      await addToCart(
        itemType === "PRODUCT_VARIANT"
          ? { itemType: "PRODUCT_VARIANT", productVariantId: id }
          : { itemType: "VEHICLE_LISTING", vehicleListingId: id },
      );
      setStatus("added");
      // Refreshes server components (the header's cart-count badge is
      // fetched there) without a full page reload.
      router.refresh();
      setTimeout(() => setStatus("idle"), 2000);
    } catch (error) {
      setStatus("idle");
      if (error instanceof ApiRequestError && error.status === 401) {
        router.push("/login");
        return;
      }
      toast.error(error instanceof ApiRequestError ? error.message : errorMessage);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
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
