"use client";

import { useRef, type InputHTMLAttributes } from "react";

const calendarIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

// Shared modern date field — a styled native <input type="date"> (keeps the
// browser/OS's own accessible calendar popup and mobile date wheel, rather
// than reimplementing one) with the browser's own calendar-icon hidden and
// replaced by one that matches this app's icon set, and a color-scheme hint
// so the native popup itself follows light/dark mode instead of always
// rendering as a plain white box. Every `<input type="date">` in the app
// should go through this instead of a raw input — see PasswordInput.tsx for
// the same "styled wrapper + overlay icon button" shape this mirrors.
export function DateInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const input = inputRef.current;
    if (input && typeof input.showPicker === "function") {
      try {
        input.showPicker();
      } catch {
        // Some browsers throw if the input isn't focused/visible at the
        // moment this is called — the input itself is still fully
        // functional by clicking directly into it, so there's nothing to
        // recover here.
      }
    }
  }

  return (
    <div className="relative">
      <input
        {...props}
        ref={inputRef}
        type="date"
        className={`w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm outline-none focus:border-primary [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden ${className ?? ""}`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={openPicker}
        className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-muted-foreground transition-colors hover:text-primary"
      >
        {calendarIcon}
      </button>
    </div>
  );
}
