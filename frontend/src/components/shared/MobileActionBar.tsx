"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

// Read by globals.css (body padding, so the bar never covers the end of the
// page) and by ChatWidget/ScrollToTopButton (lifted above the bar).
const BAR_HEIGHT_VAR = "--mobile-action-bar-height";

// Sticky bottom bar for phones/tablets (hidden from lg up, where the main
// call to action sits in a side column and stays visible): the product
// page's price + add-to-cart, checkout's total + place order. Appears only
// once `targetRef` — the page's own main button — has scrolled out of view,
// so the action is never shown twice at once. Sits above CookieNotice's bar.
export function MobileActionBar({
  targetRef,
  children,
}: {
  targetRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [targetVisible, setTargetVisible] = useState(true);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setTargetVisible(entry.isIntersecting));
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetRef]);

  const show = !targetVisible;

  // Publishes the bar's real height (0 when hidden, or at lg+ where it's
  // display:none) for the page padding and the floating buttons.
  useEffect(() => {
    const root = document.documentElement;
    const bar = barRef.current;
    if (!show || !bar) {
      root.style.setProperty(BAR_HEIGHT_VAR, "0px");
      return;
    }
    const observer = new ResizeObserver(() => root.style.setProperty(BAR_HEIGHT_VAR, `${bar.offsetHeight}px`));
    observer.observe(bar);
    return () => {
      observer.disconnect();
      root.style.setProperty(BAR_HEIGHT_VAR, "0px");
    };
  }, [show]);

  if (!show) return null;

  return (
    <div
      ref={barRef}
      className="fixed inset-x-0 z-40 border-t border-border bg-card/95 px-4 pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden"
      style={{ bottom: "var(--cookie-notice-height, 0px)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3">{children}</div>
    </div>
  );
}
