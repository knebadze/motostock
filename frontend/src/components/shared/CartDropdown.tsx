"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { resolveApiErrorMessage } from "@/lib/api-errors";
import { formatPrice } from "@/lib/format";
import { getCartItemDisplay, recomputeCart } from "@/lib/cart-item-display";
import { getMyCart, removeFromCart, updateCartItemQuantity, type Cart, type CartItem } from "@/lib/api/cart";

const PREVIEW_LIMIT = 4;

export function CartDropdown({ initialCount }: { initialCount: number }) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const tHeader = useTranslations("Header");
  const tCart = useTranslations("Cart");
  const tErrors = useTranslations("ApiErrors");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;

    setLoading(true);
    try {
      setCart(await getMyCart());
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, tErrors, tCart("loadError")));
    } finally {
      setLoading(false);
    }
  }

  async function handleQuantityChange(item: CartItem, nextQuantity: number) {
    setPendingId(item.id);
    try {
      if (nextQuantity < 1) {
        await removeFromCart(item.id);
        setCart((current) =>
          current ? recomputeCart(current.items.filter((existing) => existing.id !== item.id)) : current,
        );
      } else {
        const updated = await updateCartItemQuantity(item.id, nextQuantity);
        setCart((current) =>
          current
            ? recomputeCart(current.items.map((existing) => (existing.id === item.id ? updated : existing)))
            : current,
        );
      }
      router.refresh();
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, tErrors, tCart("updateError")));
    } finally {
      setPendingId(null);
    }
  }

  // Falls back to the server-rendered count until the dropdown is opened
  // for the first time (avoids an extra full-cart fetch on every page load
  // just to keep this badge in sync — see (guest)/layout.tsx).
  const count = cart?.itemCount ?? initialCount;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label={tHeader("cart")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary sm:size-9"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
        >
          <path d="M6 6h15l-1.5 9h-12z" />
          <path d="M6 6 5 3H2" />
          <circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        >
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">…</p>
          ) : !cart || cart.items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{tCart("empty")}</p>
          ) : (
            <>
              <ul className="flex max-h-80 flex-col divide-y divide-border overflow-y-auto">
                {cart.items.slice(0, PREVIEW_LIMIT).map((item) => {
                  const { href, title, subtitle, imageUrl } = getCartItemDisplay(item, locale);
                  const stockQuantity = item.productVariant?.stockQuantity ?? item.vehicleListing?.stockQuantity ?? 1;
                  const pending = pendingId === item.id;
                  return (
                    <li key={item.id} className="flex flex-col gap-2 p-3">
                      <Link
                        href={href}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 transition-colors hover:text-primary"
                      >
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {imageUrl ? (
                            <Image src={imageUrl} alt={title} fill sizes="48px" className="object-cover" />
                          ) : (
                            <div className="size-full border border-dashed border-border" />
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-medium text-foreground">{title}</span>
                          {subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
                        </div>
                      </Link>

                      <div className="flex items-center justify-between gap-3 pl-15">
                        <div className="flex items-center gap-1 rounded-full border border-border">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item, item.quantity - 1)}
                            disabled={pending}
                            aria-label={tCart("decreaseQuantity")}
                            className="flex size-7 items-center justify-center text-foreground transition-colors hover:text-primary disabled:opacity-40"
                          >
                            −
                          </button>
                          <span className="w-5 text-center text-xs font-medium">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item, item.quantity + 1)}
                            disabled={pending || item.quantity >= stockQuantity}
                            aria-label={tCart("increaseQuantity")}
                            className="flex size-7 items-center justify-center text-foreground transition-colors hover:text-primary disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-sm font-semibold text-primary">{formatPrice(item.lineTotal)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {cart.items.length > PREVIEW_LIMIT && (
                <p className="border-t border-border px-3 py-2 text-center text-xs text-muted-foreground">
                  +{cart.items.length - PREVIEW_LIMIT}
                </p>
              )}

              <div className="border-t border-border p-3">
                <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                  <span>{tCart("subtotal")}</span>
                  <span className="text-primary">{formatPrice(cart.subtotal)}</span>
                </div>
                <Link
                  href="/cart"
                  onClick={() => setOpen(false)}
                  className="mt-3 block rounded-full bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  {tCart("viewCart")}
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
