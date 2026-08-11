"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const SIZE_CLASSES = {
  md: "max-w-md",
  xl: "max-w-2xl",
  "2xl": "max-w-4xl",
} as const;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

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

    function handleKeyDown(event: KeyboardEvent) {
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
      document.body.style.overflow = "";
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
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={`relative flex max-h-[90vh] w-full flex-col rounded-2xl border border-border bg-card p-6 shadow-xl outline-none ${SIZE_CLASSES[size]}`}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h2 id="modal-title" className="text-lg font-bold tracking-tight">
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

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
