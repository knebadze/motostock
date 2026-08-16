"use client";

import { useState } from "react";
import Image from "next/image";
import { resolveMediaUrl } from "@/lib/api/client";
import { ImageLightbox } from "./ImageLightbox";

export type GalleryImage = { url: string; variantId: number | null };

const zoomIcon = (
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
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3M11 8v6M8 11h6" />
  </svg>
);

export function ProductGallery({
  images,
  preferredImage,
  onSelectVariant,
  alt,
}: {
  images: GalleryImage[];
  preferredImage?: string | null;
  onSelectVariant?: (variantId: number) => void;
  alt: string;
}) {
  const resolved = images
    .map((image) => ({ ...image, url: resolveMediaUrl(image.url) }))
    .filter((image): image is GalleryImage => Boolean(image.url));
  const resolvedPreferred = preferredImage ? resolveMediaUrl(preferredImage) : null;

  const [activeIndex, setActiveIndex] = useState(() => {
    const index = resolvedPreferred ? resolved.findIndex((image) => image.url === resolvedPreferred) : -1;
    return index >= 0 ? index : 0;
  });
  const [lightboxOpen, setLightboxOpen] = useState(false);

  function selectImage(index: number) {
    setActiveIndex(index);
    const variantId = resolved[index]?.variantId;
    if (variantId != null) onSelectVariant?.(variantId);
  }

  if (resolved.length === 0) {
    return (
      <div className="aspect-square w-full rounded-2xl border border-dashed border-border bg-muted" />
    );
  }

  const activeImage = resolved[Math.min(activeIndex, resolved.length - 1)];

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        aria-label={alt}
        className="relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-2xl border border-border bg-muted"
      >
        <Image
          src={activeImage.url}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          priority
        />
        <span className="absolute bottom-3 right-3 flex size-8 items-center justify-center rounded-full bg-black/50 text-white">
          {zoomIcon}
        </span>
      </button>
      {resolved.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {resolved.map((image, index) => (
            <button
              key={image.url}
              type="button"
              onClick={() => selectImage(index)}
              aria-label={`${alt} ${index + 1}`}
              className={`relative size-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                index === activeIndex ? "border-primary" : "border-transparent hover:border-border"
              }`}
            >
              <Image src={image.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <ImageLightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={resolved}
        index={activeIndex}
        onIndexChange={selectImage}
        alt={alt}
      />
    </div>
  );
}
