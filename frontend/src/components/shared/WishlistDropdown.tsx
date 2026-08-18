"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { formatPrice } from "@/lib/format";
import { listMyWishlist, removeFromWishlist, type WishlistItem } from "@/lib/api/wishlist";

const PREVIEW_LIMIT = 4;

function itemDisplay(item: WishlistItem, locale: "ka" | "en" | "ru") {
  if (item.itemType === "PRODUCT" && item.product) {
    const { product } = item;
    return {
      href: `/${product.category.slug}/${product.slug}`,
      name: product.name[locale],
      imageUrl: resolveMediaUrl(product.imageUrl),
      price: product.activeDiscount ? product.activeDiscount.discountPrice : product.minPrice,
    };
  }
  if (item.itemType === "VEHICLE_LISTING" && item.vehicleListing) {
    const { vehicleListing } = item;
    return {
      href: `/${vehicleListing.vehicleCatalog.category.slug}/${vehicleListing.id}`,
      name: `${vehicleListing.vehicleCatalog.brand.name} ${vehicleListing.vehicleCatalog.model.name}`,
      imageUrl: resolveMediaUrl(
        vehicleListing.images[0]?.imageUrl ?? vehicleListing.vehicleCatalog.imageUrl,
      ),
      price: vehicleListing.activeDiscount
        ? vehicleListing.activeDiscount.discountPrice
        : vehicleListing.price,
    };
  }
  return null;
}

export function WishlistDropdown({ initialCount }: { initialCount: number }) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const tHeader = useTranslations("Header");
  const t = useTranslations("Account.wishlist");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<WishlistItem[] | null>(null);
  const [loading, setLoading] = useState(false);
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
      setItems(await listMyWishlist());
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(id: number) {
    setItems((current) => (current ? current.filter((item) => item.id !== id) : current));
    try {
      await removeFromWishlist(id);
    } catch (error) {
      // The row is already gone from the visible list — a failed DELETE
      // just leaves a stale row server-side, harmless and self-corrects on
      // the next add/remove of the same item — but still worth telling the
      // user, since otherwise a removal that silently didn't take effect
      // looks identical to one that did.
      toast.error(error instanceof ApiRequestError ? error.message : t("removeError"));
    }
  }

  // Falls back to the server-rendered count until the dropdown is opened
  // for the first time, same reasoning as CartDropdown's count.
  const count = items?.length ?? initialCount;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label={tHeader("wishlist")}
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
          <path d="M12 21s-6.7-4.35-9.33-8.2C1.02 10.6 1.6 7.2 4.3 5.6c2.2-1.3 4.9-.8 6.3 1.1l1.4 1.9 1.4-1.9c1.4-1.9 4.1-2.4 6.3-1.1 2.7 1.6 3.28 5 1.63 7.2C18.7 16.65 12 21 12 21Z" />
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
          ) : !items || items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <>
              <ul className="flex max-h-80 flex-col divide-y divide-border overflow-y-auto">
                {items.slice(0, PREVIEW_LIMIT).map((item) => {
                  const display = itemDisplay(item, locale);
                  if (!display) return null;
                  const { href, name, imageUrl, price } = display;
                  return (
                    <li key={item.id} className="flex items-center gap-3 p-3">
                      <Link
                        href={href}
                        onClick={() => setOpen(false)}
                        className="flex min-w-0 flex-1 items-center gap-3 transition-colors hover:text-primary"
                      >
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {imageUrl ? (
                            <Image src={imageUrl} alt={name} fill sizes="48px" className="object-cover" />
                          ) : (
                            <div className="size-full border border-dashed border-border" />
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-medium text-foreground">{name}</span>
                          {price != null && (
                            <span className="text-xs font-semibold text-primary">{formatPrice(price)}</span>
                          )}
                        </div>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        aria-label={t("removeLabel")}
                        className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
                      >
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>

              {items.length > PREVIEW_LIMIT && (
                <p className="border-t border-border px-3 py-2 text-center text-xs text-muted-foreground">
                  +{items.length - PREVIEW_LIMIT}
                </p>
              )}

              <div className="border-t border-border p-3">
                <Link
                  href="/wishlist"
                  onClick={() => setOpen(false)}
                  className="block rounded-full bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  {tHeader("viewAll")}
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
