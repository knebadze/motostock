"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

const SIZE_CLASSES = {
  md: "max-w-md",
  xl: "max-w-2xl",
  "2xl": "max-w-4xl",
  "3xl": "max-w-6xl",
} as const;

// Open modals, innermost last — lets a modal open on top of another (e.g.
// an order's detail over a customer's order history). Without it, one
// Escape press closed every open modal at once (each had its own document
// keydown listener), and closing the inner one re-enabled page scrolling
// while the outer one was still open.
const openModalStack: symbol[] = [];

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  closeLabel = "დახურვა",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: keyof typeof SIZE_CLASSES;
  // Georgian default matches the admin panel's untranslated copy —
  // storefront callers pass a next-intl-translated override.
  closeLabel?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  // Unique per instance — a fixed id would be duplicated while two modals
  // are open, breaking aria-labelledby for the inner one.
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    // Remembers what had focus before the modal opened, so it can be
    // restored on close — without this, focus silently drops to <body>
    // and a keyboard user loses their place in the page. Focusing the
    // dialog itself (tabIndex=-1 below) both announces it to screen
    // readers and makes it the Tab-order anchor, so the very first Tab
    // press lands on the first real control inside.
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const stackToken = Symbol("modal");
    openModalStack.push(stackToken);

    function handleKeyDown(event: KeyboardEvent) {
      // Only the innermost open modal reacts to keys.
      if (openModalStack[openModalStack.length - 1] !== stackToken) return;
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // Wraps Tab at the dialog's edges instead of letting it escape into
      // the (visually dimmed but otherwise still-focusable) page behind it.
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
      document.removeEventListener("keydown", handleKeyDown);
      const index = openModalStack.indexOf(stackToken);
      if (index !== -1) openModalStack.splice(index, 1);
      if (openModalStack.length === 0) document.body.style.overflow = "";
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex max-h-[90vh] w-full flex-col rounded-2xl border border-border bg-card p-6 shadow-xl outline-none ${SIZE_CLASSES[size]}`}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h2 id={titleId} className="text-lg font-bold tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
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

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
