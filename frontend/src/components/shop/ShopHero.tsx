"use client";

import { useLocale } from "next-intl";
import { resolveMediaUrl } from "@/lib/api/client";
import type { Category } from "@/lib/api/categories";

export function ShopHero({ category }: { category: Category }) {
  const locale = useLocale() as "ka" | "en" | "ru";
  // Deliberately not falling back to the small square category.imageUrl here —
  // that image is sized for admin-table/mega-menu thumbnails and looks
  // stretched/cropped when cover-fit into a wide hero banner.
  const imageUrl = resolveMediaUrl(category.bannerImageUrl);

  return (
    <section className="relative flex min-h-55 items-center justify-center overflow-hidden border-b border-border sm:min-h-75 lg:min-h-95">
      {imageUrl ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
          {/* Flat, uniform scrim (not a gradient) — guarantees consistent
              text contrast no matter what the image looks like underneath,
              while keeping the photo itself sharp. */}
          <div className="absolute inset-0 bg-black/50" />
        </>
      ) : (
        <div className="absolute inset-0 bg-muted/60" />
      )}
      <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
        <h1
          className={`text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl ${
            imageUrl ? "text-white drop-shadow-md" : "text-foreground"
          }`}
        >
          {category.name[locale]}
        </h1>
      </div>
    </section>
  );
}
