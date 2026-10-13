"use client";

import { useEffect, useRef, type ReactNode } from "react";

const INTERVAL_MS = 3500;
// How long after the shopper's last touch/scroll before autoplay resumes.
const RESUME_AFTER_MS = 6000;
const PHONE_QUERY = "(max-width: 639px)";

// A horizontal snap-scroll list (<ul>) that, on phones only, advances by one
// item every few seconds and wraps back to the start at the end. Holds off
// while the shopper is touching/scrolling it (and for a while after), while
// the tab is hidden, and entirely under prefers-reduced-motion. On sm+ the
// same element is laid out by its own classes (e.g. a grid) and never moves.
export function AutoScrollTrack({ className, children }: { className: string; children: ReactNode }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const lastInteractionRef = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const phone = window.matchMedia(PHONE_QUERY);

    const markInteraction = () => {
      lastInteractionRef.current = Date.now();
    };
    track.addEventListener("touchstart", markInteraction, { passive: true });
    track.addEventListener("pointerdown", markInteraction);
    track.addEventListener("wheel", markInteraction, { passive: true });

    const timer = setInterval(() => {
      if (!phone.matches || reducedMotion.matches) return;
      if (document.visibilityState === "hidden") return;
      if (Date.now() - lastInteractionRef.current < RESUME_AFTER_MS) return;
      if (track.scrollWidth <= track.clientWidth + 4) return;

      const first = track.firstElementChild as HTMLElement | null;
      const second = first?.nextElementSibling as HTMLElement | null;
      const step = first && second ? second.offsetLeft - first.offsetLeft : track.clientWidth;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      track.scrollTo({ left: atEnd ? 0 : track.scrollLeft + step, behavior: "smooth" });
    }, INTERVAL_MS);

    return () => {
      clearInterval(timer);
      track.removeEventListener("touchstart", markInteraction);
      track.removeEventListener("pointerdown", markInteraction);
      track.removeEventListener("wheel", markInteraction);
    };
  }, []);

  return (
    <ul ref={trackRef} className={className}>
      {children}
    </ul>
  );
}
