"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { ApiRequestError } from "@/lib/api/client";
import { formatPrice } from "@/lib/format";
import { getCartItemDisplay } from "@/lib/cart-item-display";
import { removeFromCart, updateCartItemQuantity, type Cart, type CartItem } from "@/lib/api/cart";

function recompute(items: CartItem[]): Cart {
  const subtotal = Math.round(items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return { items, subtotal, itemCount };
}

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
        <Link href={href} className="font-semibold text-foreground hover:text-primary">
          {title}
        </Link>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-border">
            <button
              type="button"
              onClick={() => onQuantityChange(item.quantity - 1)}
              disabled={pending || item.quantity <= 1}
              aria-label={t("decreaseQuantity")}
              className="flex size-8 items-center justify-center text-foreground transition-colors hover:text-primary disabled:opacity-40"
            >
              −
            </button>
            <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
            <button
              type="button"
              onClick={() => onQuantityChange(item.quantity + 1)}
              disabled={pending || item.quantity >= stockQuantity}
              aria-label={t("increaseQuantity")}
              className="flex size-8 items-center justify-center text-foreground transition-colors hover:text-primary disabled:opacity-40"
            >
              +
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-semibold text-primary">{formatPrice(item.lineTotal)}</span>
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

export function CartManager({ initialCart }: { initialCart: Cart }) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Cart");
  const [cart, setCart] = useState(initialCart);
  const [pendingId, setPendingId] = useState<number | null>(null);

  async function handleQuantityChange(item: CartItem, nextQuantity: number) {
    if (nextQuantity < 1) return;
    setPendingId(item.id);
    try {
      const updated = await updateCartItemQuantity(item.id, nextQuantity);
      setCart((current) =>
        recompute(current.items.map((existing) => (existing.id === item.id ? updated : existing))),
      );
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : t("updateError"));
    } finally {
      setPendingId(null);
    }
  }

  async function handleRemove(item: CartItem) {
    setPendingId(item.id);
    try {
      await removeFromCart(item.id);
      setCart((current) => recompute(current.items.filter((existing) => existing.id !== item.id)));
      toast.success(t("removeSuccess"));
    } catch {
      toast.error(t("removeError"));
    } finally {
      setPendingId(null);
    }
  }

  if (cart.items.length === 0) {
    return <p className="mt-6 text-muted-foreground">{t("empty")}</p>;
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
            onRemove={() => handleRemove(item)}
          />
        ))}
      </ul>

      <div className="h-fit rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">{t("itemCount", { count: cart.itemCount })}</p>
        <div className="mt-2 flex items-center justify-between text-lg font-bold text-foreground">
          <span>{t("subtotal")}</span>
          <span className="text-primary">{formatPrice(cart.subtotal)}</span>
        </div>
      </div>
    </div>
  );
}
