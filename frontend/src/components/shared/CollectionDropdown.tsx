"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { resolveMediaUrl } from "@/lib/api/client";
import { resolveApiErrorMessage } from "@/lib/api-errors";
import { formatPrice } from "@/lib/format";
import type { CollectionItem } from "@/lib/api/collection-api";
import { buildVehicleListingSlug } from "@/lib/api/vehicle-listings";
import {
  dispatchCountChanged,
  COMPARE_COUNT_CHANGED_EVENT,
  WISHLIST_COUNT_CHANGED_EVENT,
} from "@/lib/badge-count-events";
import { usePopoverMenu } from "./usePopoverMenu";

const PREVIEW_LIMIT = 4;

function itemDisplay(item: CollectionItem, locale: "ka" | "en" | "ru") {
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
      href: `/${vehicleListing.vehicleCatalog.category.slug}/${buildVehicleListingSlug(vehicleListing)}`,
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

// Shared shell for WishlistDropdown/CompareDropdown, which used to be two
// ~220-line files differing only in icon, API calls, translation namespace,
// and the /wishlist vs /compare href — every other line (open/close state,
// click-outside + Escape handling, the fetch-on-open/reset-on-close badge
// pattern, the preview-list markup) was byte-for-byte identical.
// CartDropdown deliberately stays separate: its item rows need a quantity
// stepper and subtotal, not just a remove button, which doesn't fit this
// shell without awkward conditionals for its one caller.
export function CollectionDropdown({
  initialCount,
  icon,
  headerLabelKey,
  viewAllHref,
  translationNamespace,
  fetchList,
  removeItem,
}: {
  initialCount: number;
  icon: ReactNode;
  headerLabelKey: "wishlist" | "compare";
  viewAllHref: "/wishlist" | "/compare";
  translationNamespace: "Account.wishlist" | "Account.compare";
  fetchList: () => Promise<CollectionItem[]>;
  removeItem: (id: number) => Promise<void>;
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const tHeader = useTranslations("Header");
  const t = useTranslations(translationNamespace);
  const tErrors = useTranslations("ApiErrors");
  const { open, setOpen, containerRef, triggerRef } = usePopoverMenu({ arrowNav: false });
  const [items, setItems] = useState<CollectionItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  // Reflects a mutation made elsewhere on the page (WishlistButton/
  // CompareButton on a product/vehicle card) without a `router.refresh()` —
  // see badge-count-events.ts. Only matters while the dropdown is closed
  // (`items === null`, badge showing `initialCount`); once opened, `items`'
  // own length takes over below.
  const countChangedEvent = headerLabelKey === "wishlist" ? WISHLIST_COUNT_CHANGED_EVENT : COMPARE_COUNT_CHANGED_EVENT;
  const [countOverride, setCountOverride] = useState<number | null>(null);
  useEffect(() => {
    function handleCountChanged(event: Event) {
      setCountOverride((event as CustomEvent<number>).detail);
    }
    window.addEventListener(countChangedEvent, handleCountChanged);
    return () => window.removeEventListener(countChangedEvent, handleCountChanged);
  }, [countChangedEvent]);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (!next) {
      // Drops the locally-fetched list on close so the badge falls back to
      // countOverride/initialCount again instead of permanently shadowing
      // them.
      setItems(null);
      return;
    }

    setLoading(true);
    try {
      setItems(await fetchList());
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, tErrors, t("loadError")));
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(id: number) {
    // Captured from inside the setItems updater (always sees the latest
    // `items`) so the dispatch below carries the exact same count the badge
    // itself just switched to.
    let newLength: number | null = null;
    setItems((current) => {
      if (!current) return current;
      const filtered = current.filter((item) => item.id !== id);
      newLength = filtered.length;
      return filtered;
    });
    try {
      await removeItem(id);
      // Tells this badge (and any other page's instance, though there's
      // only ever one) the fresh count directly, instead of a
      // `router.refresh()` that would re-run this whole route's server
      // component tree just to update one integer.
      if (newLength != null) dispatchCountChanged(countChangedEvent, newLength);
    } catch (error) {
      // The row is already gone from the visible list — a failed DELETE
      // just leaves a stale row server-side, harmless and self-corrects on
      // the next add/remove of the same item — but still worth telling the
      // user, since otherwise a removal that silently didn't take effect
      // looks identical to one that did.
      toast.error(resolveApiErrorMessage(error, tErrors, t("removeError")));
    }
  }

  // Falls back to the server-rendered count until the dropdown is opened
  // for the first time, same reasoning as CartDropdown's count.
  const count = items?.length ?? countOverride ?? initialCount;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-label={tHeader(headerLabelKey)}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary-text sm:size-10"
      >
        {icon}
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
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
                        className="flex min-w-0 flex-1 items-center gap-3 transition-colors hover:text-primary-text"
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
                            <span className="text-xs font-semibold text-primary-text">{formatPrice(price)}</span>
                          )}
                        </div>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        aria-label={t("removeLabel")}
                        className="shrink-0 text-muted-foreground transition-colors hover:text-primary-text"
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
                  href={viewAllHref}
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
