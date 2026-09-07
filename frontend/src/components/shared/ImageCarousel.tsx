"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

const AUTOPLAY_MS = 5000;
// Minimum horizontal drag distance (px) before a touch gesture counts as a
// swipe rather than a tap/scroll — same threshold and reasoning as
// HeroSlider.tsx's identical constant.
const SWIPE_THRESHOLD_PX = 40;

export type CarouselImage = {
  // Empty until the real photo is dropped in — the slot renders as a
  // placeholder box until then, same "no image" treatment used across the
  // shop (see ProductCard.tsx etc).
  src: string;
  alt: string;
};

// Shared by the About page's gallery and the homepage info cards — same
// autoplay/pause-on-hover/dots/arrows carousel, just re-sized per caller via
// aspectClassName instead of being hardcoded to one page's layout. Both
// callers are storefront-only, never admin — safe to call useTranslations
// directly instead of threading translated label props from every caller.
export function ImageCarousel({
  images,
  aspectClassName = "aspect-video",
  // Set false when the caller already provides its own rounded/bordered
  // wrapper (e.g. a card that clips this carousel at its top) — avoids a
  // visible double border/corner-radius.
  bordered = true,
}: {
  images: CarouselImage[];
  aspectClassName?: string;
  bordered?: boolean;
}) {
  const t = useTranslations("Common.imageCarousel");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Touch-swipe support — previously the only way to change images on a
  // touch device was the arrow buttons, which are hidden below the `sm`
  // breakpoint (`hidden sm:flex`), leaving mobile visitors with no real way
  // to navigate the carousel besides waiting for autoplay. Same
  // horizontal-only tracking as HeroSlider.tsx's identical handlers, so a
  // vertical page-scroll gesture isn't hijacked into an image change.
  const touchStartXRef = useRef<number | null>(null);

  function handleTouchStart(event: React.TouchEvent) {
    touchStartXRef.current = event.touches[0].clientX;
    setPaused(true);
  }

  function handleTouchEnd(event: React.TouchEvent) {
    const startX = touchStartXRef.current;
    touchStartXRef.current = null;
    setPaused(false);
    if (startX == null || images.length <= 1) return;

    const deltaX = event.changedTouches[0].clientX - startX;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;

    if (deltaX < 0) {
      setIndex((current) => (current + 1) % images.length);
    } else {
      setIndex((current) => (current - 1 + images.length) % images.length);
    }
  }

  useEffect(() => {
    if (images.length <= 1 || paused) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % images.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [images.length, paused]);

  if (images.length === 0) return null;

  const image = images[index];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full overflow-hidden bg-muted ${bordered ? "rounded-2xl border border-border" : ""} ${aspectClassName}`}
    >
      {image.src ? (
        <Image src={image.src} alt={image.alt} fill priority={index === 0} className="object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center border border-dashed border-border">
          <span className="text-sm text-muted-foreground">{image.alt}</span>
        </div>
      )}

      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label={t("prevImage")}
            onClick={() => setIndex((current) => (current - 1 + images.length) % images.length)}
            className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/30 p-2 text-white transition-colors hover:bg-black/50 sm:flex"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={t("nextImage")}
            onClick={() => setIndex((current) => (current + 1) % images.length)}
            className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/30 p-2 text-white transition-colors hover:bg-black/50 sm:flex"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2">
            {images.map((img, i) => (
              <button
                key={img.alt}
                type="button"
                aria-label={t("imageDot", { index: i + 1 })}
                onClick={() => setIndex(i)}
                // Padding gives each dot a ~30px tap target instead of the
                // visible dot's bare 10px — same fix as HeroSlider.tsx's
                // identical dots; the visible size/spacing is unchanged (the
                // inner span below still renders at the original size).
                className="p-2.5"
              >
                <span
                  className={`block size-2.5 rounded-full transition-colors ${i === index ? "bg-white" : "bg-white/40"}`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
