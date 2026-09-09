"use client";

import { useState } from "react";

// Selection-set + "confirm before applying a >50% discount" bookkeeping
// shared between BulkProductDiscountsPanel and BulkVehicleListingDiscountsPanel
// — both let the admin build up a working set of ids across several filter
// passes (selecting/deselecting only what's currently visible without
// losing earlier picks) before applying one discount to all of them. The
// actual apply call (API function + success/error toasts, which differ in
// wording and endpoint per domain) stays in each panel.
export function useBulkDiscountSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [highPercentConfirmOpen, setHighPercentConfirmOpen] = useState(false);

  function toggleOne(id: number, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function selectVisible(visibleIds: number[]) {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of visibleIds) next.add(id);
      return next;
    });
  }

  function deselectVisible(visibleIds: number[]) {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of visibleIds) next.delete(id);
      return next;
    });
  }

  // A discount over 50% is unusual enough to be worth a second look before
  // it's applied — this hits every one of the (potentially many) selected
  // items at once, so a typo here is more costly than on a single-item
  // discount form.
  function handleApplyClick(discountPercent: string, apply: () => void) {
    const percentNum = Number(discountPercent);
    if (discountPercent.trim() !== "" && Number.isFinite(percentNum) && percentNum > 50) {
      setHighPercentConfirmOpen(true);
      return;
    }
    apply();
  }

  return {
    selectedIds,
    setSelectedIds,
    toggleOne,
    selectVisible,
    deselectVisible,
    highPercentConfirmOpen,
    setHighPercentConfirmOpen,
    handleApplyClick,
  };
}

// Builds the {value,label} option list for a Select filter from a list of
// items — used for every brand/size/color/condition filter across the bulk
// discount panels, which all walk the candidates collecting unique
// id->label pairs in the same way.
export function deriveOptionMap<T>(
  items: T[],
  getEntry: (item: T) => { id: number; label: string } | null | undefined,
): { value: string; label: string }[] {
  const map = new Map<number, string>();
  for (const item of items) {
    const entry = getEntry(item);
    if (entry) map.set(entry.id, entry.label);
  }
  return Array.from(map, ([id, label]) => ({ value: String(id), label }));
}
