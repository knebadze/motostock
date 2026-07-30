"use client";

import { useState } from "react";
import { resolveMediaUrl } from "@/lib/api/client";

export type GalleryImage = { url: string; variantId: number | null };

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
      <div className="aspect-square w-full overflow-hidden rounded-2xl border border-border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={activeImage.url} alt={alt} className="size-full object-cover" />
      </div>
      {resolved.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {resolved.map((image, index) => (
            <button
              key={image.url}
              type="button"
              onClick={() => selectImage(index)}
              aria-label={`${alt} ${index + 1}`}
              className={`size-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                index === activeIndex ? "border-primary" : "border-transparent hover:border-border"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
