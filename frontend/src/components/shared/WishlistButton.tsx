"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { ApiRequestError } from "@/lib/api/client";
import {
  addToWishlist,
  getWishlistStatus,
  removeFromWishlist,
  type WishlistItemType,
} from "@/lib/api/wishlist";

const heartPath =
  "M12 21s-6.7-4.35-9.33-8.2C1.02 10.6 1.6 7.2 4.3 5.6c2.2-1.3 4.9-.8 6.3 1.1l1.4 1.9 1.4-1.9c1.4-1.9 4.1-2.4 6.3-1.1 2.7 1.6 3.28 5 1.63 7.2C18.7 16.65 12 21 12 21Z";

export function WishlistButton({
  itemType,
  id,
  variant = "icon",
  labelSave = "სასურველებში დამატება",
  labelSaved = "სასურველებშია",
  className = "",
  initialWishlistItemId = undefined,
  onChange,
}: {
  itemType: WishlistItemType;
  id: number;
  variant?: "icon" | "button";
  labelSave?: string;
  labelSaved?: string;
  className?: string;
  // Skips the status lookup when the caller already knows it (e.g. the
  // account wishlist page, where every card is wishlisted by definition).
  initialWishlistItemId?: number | null;
  // Fired after a successful add/remove — lets a parent list (e.g. the
  // wishlist page) drop the card immediately instead of waiting for a
  // full refetch.
  onChange?: (wishlisted: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // The wishlist row's own id (needed for DELETE) — not just a boolean —
  // since it's fetched lazily per button rather than batched across a
  // whole grid. Fine at current catalog size; worth batching later if a
  // page ever renders dozens of these at once.
  const [wishlistItemId, setWishlistItemId] = useState<number | null>(
    initialWishlistItemId ?? null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialWishlistItemId !== undefined) return;
    let cancelled = false;

    async function checkStatus() {
      try {
        const status =
          itemType === "PRODUCT"
            ? await getWishlistStatus([id], [])
            : await getWishlistStatus([], [id]);
        if (!cancelled && status.items.length > 0) {
          setWishlistItemId(status.items[0].id);
        }
      } catch {
        // Logged-out visitors 401 here — the heart just starts empty.
      }
    }

    checkStatus();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemType, id]);

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (loading) return;

    setLoading(true);
    try {
      if (wishlistItemId != null) {
        await removeFromWishlist(wishlistItemId);
        setWishlistItemId(null);
        onChange?.(false);
      } else {
        const item = await addToWishlist(
          itemType === "PRODUCT"
            ? { itemType: "PRODUCT", productId: id }
            : { itemType: "VEHICLE_LISTING", vehicleListingId: id },
        );
        setWishlistItemId(item.id);
        onChange?.(true);
      }
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        router.push({ pathname: "/login", query: { redirect: pathname } });
        return;
      }
      toast.error("ვერ განხორციელდა, სცადეთ თავიდან");
    } finally {
      setLoading(false);
    }
  }

  const active = wishlistItemId != null;

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
          active
            ? "border-primary bg-primary/10 text-primary"
            : "border-border text-foreground hover:border-primary hover:text-primary"
        } ${className}`}
      >
        <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} className="size-4">
          <path d={heartPath} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {active ? labelSaved : labelSave}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-label={active ? labelSaved : labelSave}
      aria-pressed={active}
      className={`flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:text-primary disabled:opacity-60 ${
        active ? "text-primary" : ""
      } ${className}`}
    >
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} className="size-4">
        <path d={heartPath} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
