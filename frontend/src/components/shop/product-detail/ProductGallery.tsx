"use client";

import { useState } from "react";
import { resolveMediaUrl } from "@/lib/api/client";

export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const resolved = images
    .map((url) => resolveMediaUrl(url))
    .filter((url): url is string => Boolean(url));

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
        <img src={activeImage} alt={alt} className="size-full object-cover" />
      </div>
      {resolved.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {resolved.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`${alt} ${index + 1}`}
              className={`size-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                index === activeIndex ? "border-primary" : "border-transparent hover:border-border"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
