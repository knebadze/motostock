"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import type { GalleryImage } from "./ProductGallery";

const closeIcon = (
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
);

const chevronLeft = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-6"
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const chevronRight = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-6"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const ZOOM_SCALE = 2.5;

// Click/tap toggles zoom, centered on the clicked point; while zoomed, the
// crop follows the cursor on desktop. Owns its own zoom state and is keyed
// by image index from the parent (below) — remounting on index change is
// what resets zoom when switching pictures, instead of a setState-in-effect.
function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const wrapRef = useRef<HTMLDivElement>(null);

  function updateOrigin(event: React.MouseEvent<HTMLDivElement>) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setOrigin({ x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) });
  }

  return (
    <div
      ref={wrapRef}
      onClick={(event) => {
        updateOrigin(event);
        setZoomed((current) => !current);
      }}
      onMouseMove={(event) => zoomed && updateOrigin(event)}
      className={`relative size-full overflow-hidden ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="100vw"
        quality={90}
        className="object-contain transition-transform duration-200 ease-out"
        style={{
          transform: zoomed ? `scale(${ZOOM_SCALE})` : "scale(1)",
          transformOrigin: `${origin.x}% ${origin.y}%`,
        }}
      />
    </div>
  );
}

// Fullscreen image viewer — a hand-rolled lightbox rather than a pinch-zoom
// library, same convention as this codebase's hand-rolled icons (see
// social-icons.tsx). Storefront-only (product detail gallery), never admin
// — safe to call useTranslations directly.
export function ImageLightbox({
  open,
  onClose,
  images,
  index,
  onIndexChange,
  alt,
}: {
  open: boolean;
  onClose: () => void;
  images: GalleryImage[];
  index: number;
  onIndexChange: (index: number) => void;
  alt: string;
}) {
  const tModal = useTranslations("Common.modal");
  const tCarousel = useTranslations("Common.imageCarousel");
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft" && images.length > 1) {
        onIndexChange((index - 1 + images.length) % images.length);
      } else if (event.key === "ArrowRight" && images.length > 1) {
        onIndexChange((index + 1) % images.length);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose, images.length, index, onIndexChange]);

  if (!open) return null;

  const activeImage = images[Math.min(index, images.length - 1)];

  return createPortal(
    <div className="fixed inset-0 z-100 flex flex-col bg-black/95">
      <div className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-6">
        <span className="text-sm font-medium text-white/70">
          {images.length > 1 ? `${index + 1} / ${images.length}` : ""}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={tModal("close")}
          className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          {closeIcon}
        </button>
      </div>

      <div className="relative min-h-0 flex-1 px-4 sm:px-14">
        <ZoomableImage key={index} src={activeImage.url} alt={alt} />

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label={tCarousel("prevImage")}
              onClick={(event) => {
                event.stopPropagation();
                onIndexChange((index - 1 + images.length) % images.length);
              }}
              className="absolute left-1 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 sm:flex"
            >
              {chevronLeft}
            </button>
            <button
              type="button"
              aria-label={tCarousel("nextImage")}
              onClick={(event) => {
                event.stopPropagation();
                onIndexChange((index + 1) % images.length);
              }}
              className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 sm:flex"
            >
              {chevronRight}
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex shrink-0 justify-center gap-2 overflow-x-auto px-4 py-4">
          {images.map((image, i) => (
            <button
              key={image.url}
              type="button"
              onClick={() => onIndexChange(i)}
              aria-label={`${alt} ${i + 1}`}
              className={`relative size-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                i === index ? "border-primary" : "border-transparent hover:border-white/40"
              }`}
            >
              <Image src={image.url} alt="" fill sizes="56px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
