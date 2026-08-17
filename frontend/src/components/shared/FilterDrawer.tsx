"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Mobile counterpart to the shop pages' always-visible desktop filter
// <aside> (see ProductShopPage/VehicleShopPage/ShopAllProductsPage) — same
// filter fields, rendered here instead behind a "ფილტრი" button on small
// screens. Same focus-trap/Escape/scroll-lock/portal plumbing as Modal.tsx,
// just slid in from the left edge instead of centered, with a close button
// pinned above the (independently scrollable) filter list.
export function FilterDrawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  // Drives the slide-in transition — starts false so the panel paints
  // off-screen first, then flips true a frame later so the translate-x
  // change actually animates instead of snapping straight to open.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => setVisible(true));
    panelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(raf);
      setVisible(false);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-100">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-drawer-title"
        tabIndex={-1}
        className={`absolute inset-y-0 left-0 flex h-full w-[85vw] max-w-sm flex-col border-r border-border bg-card shadow-xl outline-none transition-transform duration-200 ${
          visible ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
          <h2 id="filter-drawer-title" className="text-lg font-bold tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="დახურვა"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
