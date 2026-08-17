"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const AUTOPLAY_MS = 5000;

export type CarouselImage = {
  // Empty until the real photo is dropped in — the slot renders as a
  // placeholder box until then, same "no image" treatment used across the
  // shop (see ProductCard.tsx etc).
  src: string;
  alt: string;
};

// Shared by the About page's gallery and the homepage info cards — same
// autoplay/pause-on-hover/dots/arrows carousel, just re-sized per caller via
// aspectClassName instead of being hardcoded to one page's layout.
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
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

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
            aria-label="წინა სურათი"
            onClick={() => setIndex((current) => (current - 1 + images.length) % images.length)}
            className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/30 p-2 text-white transition-colors hover:bg-black/50 sm:flex"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="შემდეგი სურათი"
            onClick={() => setIndex((current) => (current + 1) % images.length)}
            className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/30 p-2 text-white transition-colors hover:bg-black/50 sm:flex"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
            {images.map((img, i) => (
              <button
                key={img.alt}
                type="button"
                aria-label={`სურათი ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`size-2.5 rounded-full transition-colors ${i === index ? "bg-white" : "bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
