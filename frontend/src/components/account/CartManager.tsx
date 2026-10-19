"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { resolveApiErrorMessage } from "@/lib/api-errors";
import { formatPrice } from "@/lib/format";
import { getCartItemDisplay, recomputeCart } from "@/lib/cart-item-display";
import { removeFromCart, updateCartItemQuantity, type Cart, type CartItem } from "@/lib/api/cart";
import type { PublicDeliveryInfo } from "@/lib/api/settings";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { QuantityStepper } from "@/components/shared/QuantityStepper";

function CartLineRow({
  item,
  locale,
  pending,
  onQuantityChange,
  onRemove,
}: {
  item: CartItem;
  locale: "ka" | "en" | "ru";
  pending: boolean;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("Cart");
  const { href, title, subtitle, imageUrl } = getCartItemDisplay(item, locale);
  const stockQuantity = item.productVariant?.stockQuantity ?? item.vehicleListing?.stockQuantity ?? 1;

  return (
    <li className="flex gap-4 rounded-2xl border border-border bg-card p-4">
      <Link href={href} className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
        {imageUrl ? (
          <Image src={imageUrl} alt={title} fill sizes="80px" className="object-cover" />
        ) : (
          <div className="size-full border border-dashed border-border" />
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1">
        <Link href={href} className="font-semibold text-foreground hover:text-primary-text">
          {title}
        </Link>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        {item.purchasableOnline === false && (
          <p className="text-sm font-medium text-red-600">{t("itemNotPurchasableOnline")}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <QuantityStepper
            quantity={item.quantity}
            onDecrease={() => onQuantityChange(item.quantity - 1)}
            onIncrease={() => onQuantityChange(item.quantity + 1)}
            decrementDisabled={pending || item.quantity <= 1}
            incrementDisabled={pending || item.quantity >= stockQuantity}
            decreaseLabel={t("decreaseQuantity")}
            increaseLabel={t("increaseQuantity")}
            size="md"
          />

          <div className="flex items-center gap-3">
            <span className="font-semibold text-primary-text">{formatPrice(item.lineTotal)}</span>
            <button
              type="button"
              onClick={onRemove}
              disabled={pending}
              className="text-sm text-muted-foreground underline-offset-2 transition-colors hover:text-red-600 hover:underline disabled:opacity-40"
            >
              {t("remove")}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

// deliveryInfo: Settings → delivery prices for the "delivery: Tbilisi X ·
// regions Y · pickup free" hint under the subtotal (null — no hint).
export function CartManager({
  initialCart,
  deliveryInfo = null,
}: {
  initialCart: Cart;
  deliveryInfo?: PublicDeliveryInfo | null;
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Cart");
  const tCommon = useTranslations("Common");
  const tErrors = useTranslations("ApiErrors");
  const router = useRouter();
  const [cart, setCart] = useState(initialCart);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [removingItem, setRemovingItem] = useState<CartItem | null>(null);

  // React's documented "adjusting state when a prop changes" pattern
  // (setState during render, not in an effect) — without this, `cart` only
  // ever reflects the prop this component mounted with. A router.refresh()
  // triggered by another surface entirely (e.g. the header's CartDropdown)
  // re-fetches `initialCart` server-side, but this already-mounted
  // component never picked up the new prop value.
  const [syncedInitialCart, setSyncedInitialCart] = useState(initialCart);
  if (initialCart !== syncedInitialCart) {
    setSyncedInitialCart(initialCart);
    setCart(initialCart);
  }

  async function handleQuantityChange(item: CartItem, nextQuantity: number) {
    if (nextQuantity < 1) return;
    setPendingId(item.id);
    try {
      const updated = await updateCartItemQuantity(item.id, nextQuantity);
      setCart((current) =>
        // The update response doesn't carry purchasableOnline (only GET
        // /cart computes it) — kept from the row being replaced.
        recomputeCart(
          current.items.map((existing) =>
            existing.id === item.id ? { ...updated, purchasableOnline: existing.purchasableOnline } : existing,
          ),
        ),
      );
      // Keeps the Header's server-rendered cart badge in sync — same fix
      // CartDropdown.tsx's handleQuantityChange already applies.
      router.refresh();
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, tErrors, t("updateError")));
    } finally {
      setPendingId(null);
    }
  }

  // ConfirmDialog shows its own success/error toast (via successMessage/
  // errorFallback below) and manages its own button-loading state — this
  // only needs to do the actual removal and drop the row from local state;
  // pendingId still disables the row's quantity buttons while it's in
  // flight, same as the quantity-change path above.
  async function handleRemove() {
    if (!removingItem) return;
    setPendingId(removingItem.id);
    try {
      await removeFromCart(removingItem.id);
      setCart((current) =>
        recomputeCart(current.items.filter((existing) => existing.id !== removingItem.id)),
      );
      // Keeps the Header's server-rendered cart badge in sync — same fix
      // CartDropdown.tsx's handleQuantityChange already applies.
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-start gap-4">
        <p className="text-muted-foreground">{t("empty")}</p>
        <Link
          href="/catalog"
          className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          {t("continueShopping")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
      <ul className="flex flex-col gap-4">
        {cart.items.map((item) => (
          <CartLineRow
            key={item.id}
            item={item}
            locale={locale}
            pending={pendingId === item.id}
            onQuantityChange={(quantity) => handleQuantityChange(item, quantity)}
            onRemove={() => setRemovingItem(item)}
          />
        ))}
      </ul>

      <div className="h-fit rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">{t("itemCount", { count: cart.itemCount })}</p>
        <div className="mt-2 flex items-center justify-between text-lg font-bold text-foreground">
          <span>{t("subtotal")}</span>
          <span className="text-primary-text">{formatPrice(cart.subtotal)}</span>
        </div>
        {deliveryInfo && (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {/* Follows which delivery methods the admin left on. */}
            {deliveryInfo.methods.courier
              ? t(deliveryInfo.methods.pickup ? "deliveryHint" : "deliveryHintNoPickup", {
                  tbilisi: deliveryInfo.tbilisi.price > 0 ? formatPrice(deliveryInfo.tbilisi.price) : t("deliveryFree"),
                  regions: deliveryInfo.regions.price > 0 ? formatPrice(deliveryInfo.regions.price) : t("deliveryFree"),
                })
              : t("deliveryHintPickupOnly")}{" "}
            <Link href="/shipping" className="font-medium text-primary-text hover:underline">
              {t("deliveryHintLink")}
            </Link>
          </p>
        )}
        {/* Checkout would refuse an item whose category can't be bought
            online (NOT_PURCHASABLE_ONLINE_ITEM) — blocked here until it's
            removed (each such row says so). */}
        {cart.items.some((item) => item.purchasableOnline === false) ? (
          <span
            aria-disabled
            className="mt-4 block cursor-not-allowed rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground opacity-50"
          >
            {t("goToCheckout")}
          </span>
        ) : (
          <Link
            href="/checkout"
            className="mt-4 block rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            {t("goToCheckout")}
          </Link>
        )}
      </div>

      <ConfirmDialog
        open={removingItem !== null}
        onClose={() => setRemovingItem(null)}
        title={t("deleteConfirmTitle")}
        message={t("deleteConfirmMessage", {
          name: removingItem ? getCartItemDisplay(removingItem, locale).title : "",
        })}
        confirmLabel={t("remove")}
        successMessage={t("removeSuccess")}
        onConfirm={handleRemove}
        cancelLabel={tCommon("confirmDialog.cancel")}
        processingLabel={tCommon("confirmDialog.processing")}
        errorFallback={t("removeError")}
        resolveErrorMessage={(error) => resolveApiErrorMessage(error, tErrors, t("removeError"))}
        closeLabel={tCommon("modal.close")}
        loaderLabel={tCommon("loader.loading")}
      />
    </div>
  );
}
