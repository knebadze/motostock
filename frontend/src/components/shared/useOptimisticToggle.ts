"use client";

import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { ApiRequestError } from "@/lib/api/client";

// Shared by every simple admin list with an isActive toggle per row
// (Faq/HeroSlide/Bank/TeamMember/ServiceType/HomepageSection managers) —
// optimistically flips the row, calls the update API, and rolls back with a
// toast on failure. Extracted after the same ~10-line function (down to the
// exact Georgian error string) was independently copy-pasted into all 6.
//
// `onSuccess`, when given, is called with the server's returned row —
// HomepageSectionsManager needs this (its update response can carry fields
// beyond isActive that the optimistic patch can't guess at); every other
// caller can omit it and just keep the optimistic value as-is.
export function useOptimisticToggle<T extends { id: number }>(
  items: T[],
  setItems: Dispatch<SetStateAction<T[]>>,
  updateFn: (id: number, patch: { isActive: boolean }) => Promise<T>,
  onSuccess?: (updated: T) => void,
) {
  return async function toggleActive(item: T, isActive: boolean) {
    const previous = items;
    setItems((current) =>
      current.map((existing) => (existing.id === item.id ? { ...existing, isActive } : existing)),
    );
    try {
      const updated = await updateFn(item.id, { isActive });
      onSuccess?.(updated);
    } catch (error) {
      setItems(previous);
      const message = error instanceof ApiRequestError ? error.message : "განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  };
}
