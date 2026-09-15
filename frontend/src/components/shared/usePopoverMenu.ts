"use client";

import { useEffect, useRef, useState } from "react";
import { attachMenuKeyboardNav } from "@/lib/menuKeyboardNav";

// Shared open/close + click-outside + Escape-to-close wiring for the
// header's popover menus (cart/wishlist/compare dropdowns, the account
// menu) — this exact pair of effects was independently copy-pasted into
// all four. `arrowNav` is required (not defaulted) so each caller states
// its own intent explicitly: `false` for the cart/wishlist/compare
// popovers (they mix links/images/buttons under one panel, not a list of
// role="menuitem" commands, so only Escape-to-close applies — see
// attachMenuKeyboardNav's own comment), `true` for the account menu (a
// real list of menu commands).
export function usePopoverMenu({ arrowNav }: { arrowNav: boolean }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (!open || !containerRef.current) return;
    return attachMenuKeyboardNav(containerRef.current, () => setOpen(false), {
      triggerEl: triggerRef.current,
      arrowNav,
    });
  }, [open, arrowNav]);

  return { open, setOpen, containerRef, triggerRef };
}
