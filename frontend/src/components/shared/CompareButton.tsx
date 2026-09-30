"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { resolveApiErrorMessage } from "@/lib/api-errors";
import {
  addToCompare,
  getCompareCount,
  getCompareStatus,
  removeFromCompare,
  type CompareItemType,
} from "@/lib/api/compare";
import { dispatchCountChanged, COMPARE_COUNT_CHANGED_EVENT } from "@/lib/badge-count-events";

// A "compare scales" glyph — two bars of unequal height on a shared base,
// distinct from WishlistButton's heart at a glance.
const scalesPath = "M4 20h16M7 20V10m5 10V4m5 16v-7";

// Only ever rendered on the storefront (product/vehicle cards and detail
// pages), never in the admin panel — safe to call useTranslations directly
// instead of threading translated label props from every call site.
export function CompareButton({
  itemType,
  id,
  variant = "icon",
  labelAdd,
  labelAdded,
  className = "",
  initialCompareItemId = undefined,
  onChange,
}: {
  itemType: CompareItemType;
  id: number;
  variant?: "icon" | "button";
  labelAdd?: string;
  labelAdded?: string;
  className?: string;
  // Skips the individual status lookup when the caller already knows it:
  // a definite number/null (the comparison page, where every card is
  // compared by definition, or a grid that already resolved a batched
  // lookup — see useCollectionStatusMap.ts) or the "pending" sentinel (a
  // grid's batched lookup is still in flight — wait for the real answer
  // instead of also firing this button's own redundant request). Omitted
  // entirely (undefined) means no parent is managing this — check for
  // ourselves, same as before batching existed.
  initialCompareItemId?: number | null | "pending";
  // Fired after a successful add/remove — lets a parent list (e.g. the
  // comparison page) drop the card immediately instead of waiting for a
  // full refetch.
  onChange?: (compared: boolean) => void;
}) {
  const t = useTranslations("Common.compareButton");
  const tErrors = useTranslations("ApiErrors");
  const resolvedLabelAdd = labelAdd ?? t("add");
  const resolvedLabelAdded = labelAdded ?? t("added");
  // The compare row's own id (needed for DELETE) — not just a boolean.
  const [compareItemId, setCompareItemId] = useState<number | null>(
    typeof initialCompareItemId === "number" ? initialCompareItemId : null,
  );
  const [loading, setLoading] = useState(false);

  // Adopts a batched answer once a parent's useCollectionStatusMap lookup
  // resolves (initialCompareItemId transitioning from "pending"/undefined to
  // a definite number|null) — without this, a card whose parent is still
  // waiting on the batch at mount time would never learn the real answer.
  useEffect(() => {
    if (initialCompareItemId === "pending" || initialCompareItemId === undefined) return;
    // Syncing to a value owned by a parent (see the comment above) — same
    // established pattern as ThemeToggle.tsx's mount-sync effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompareItemId(initialCompareItemId);
  }, [initialCompareItemId]);

  useEffect(() => {
    // A parent has taken ownership of this lookup (a definite value, or
    // "pending" while its own batched call is in flight) — never also fire
    // our own individual request in either case.
    if (initialCompareItemId !== undefined) return;
    let cancelled = false;

    async function checkStatus() {
      try {
        const status =
          itemType === "PRODUCT"
            ? await getCompareStatus([id], [])
            : await getCompareStatus([], [id]);
        if (!cancelled && status.items.length > 0) {
          setCompareItemId(status.items[0].id);
        }
      } catch {
        // Guest visitors are always allowed here, but a failed lookup
        // (network hiccup etc.) just leaves the button starting empty.
      }
    }

    checkStatus();
    return () => {
      cancelled = true;
    };
  }, [itemType, id, initialCompareItemId]);

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (loading) return;

    setLoading(true);
    try {
      if (compareItemId != null) {
        await removeFromCompare(compareItemId);
        setCompareItemId(null);
        onChange?.(false);
      } else {
        const item = await addToCompare(
          itemType === "PRODUCT"
            ? { itemType: "PRODUCT", productId: id }
            : { itemType: "VEHICLE_LISTING", vehicleListingId: id },
        );
        setCompareItemId(item.id);
        onChange?.(true);
      }
      // Tells the header's CompareDropdown its fresh count directly, instead
      // of a `router.refresh()` that would re-run this entire route's whole
      // server component tree just to update one integer.
      dispatchCountChanged(COMPARE_COUNT_CHANGED_EVENT, await getCompareCount());
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, tErrors, t("error")));
    } finally {
      setLoading(false);
    }
  }

  const active = compareItemId != null;

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
          active
            ? "border-primary bg-primary/10 text-primary-text"
            : "border-border text-foreground hover:border-primary hover:text-primary-text"
        } ${className}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
          <path d={scalesPath} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {active ? resolvedLabelAdded : resolvedLabelAdd}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-label={active ? resolvedLabelAdded : resolvedLabelAdd}
      aria-pressed={active}
      className={`flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:text-primary-text disabled:opacity-60 ${
        active ? "text-primary-text" : ""
      } ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
        <path d={scalesPath} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
