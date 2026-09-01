"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { resolveApiErrorMessage } from "@/lib/api-errors";
import {
  addToCompare,
  getCompareStatus,
  removeFromCompare,
  type CompareItemType,
} from "@/lib/api/compare";

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
  // Skips the status lookup when the caller already knows it (e.g. the
  // comparison page, where every card is compared by definition).
  initialCompareItemId?: number | null;
  // Fired after a successful add/remove — lets a parent list (e.g. the
  // comparison page) drop the card immediately instead of waiting for a
  // full refetch.
  onChange?: (compared: boolean) => void;
}) {
  const t = useTranslations("Common.compareButton");
  const tErrors = useTranslations("ApiErrors");
  const resolvedLabelAdd = labelAdd ?? t("add");
  const resolvedLabelAdded = labelAdded ?? t("added");
  // The compare row's own id (needed for DELETE) — not just a boolean —
  // since it's fetched lazily per button rather than batched across a
  // whole grid. Fine at current catalog size; worth batching later if a
  // page ever renders dozens of these at once.
  const [compareItemId, setCompareItemId] = useState<number | null>(
    initialCompareItemId ?? null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemType, id]);

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
            ? "border-primary bg-primary/10 text-primary"
            : "border-border text-foreground hover:border-primary hover:text-primary"
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
      className={`flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:text-primary disabled:opacity-60 ${
        active ? "text-primary" : ""
      } ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
        <path d={scalesPath} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
