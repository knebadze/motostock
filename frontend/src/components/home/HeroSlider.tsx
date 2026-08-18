"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { resolveMediaUrl } from "@/lib/api/client";
import type { HeroSlide, HeroSlideTextPosition, HeroSlideVerticalPosition } from "@/lib/api/hero-slides";
import type { GarageVehicle, VehicleCatalogEntry } from "@/lib/api/vehicle-catalog";
import type { Category } from "@/lib/api/categories";
import { VehicleSearchForm } from "./VehicleSearchForm";
import { CategorySearchForm } from "./CategorySearchForm";

const AUTOPLAY_MS = 6000;
// Minimum horizontal drag distance (px) before a touch gesture counts as a
// swipe rather than a tap/scroll — low enough to feel responsive, high
// enough that a slightly-diagonal vertical scroll on the page doesn't
// accidentally trigger a slide change.
const SWIPE_THRESHOLD_PX = 40;

const TEXT_POSITION_CLASSES: Record<HeroSlideTextPosition, string> = {
  LEFT: "items-start text-left",
  CENTER: "items-center text-center",
  RIGHT: "items-end text-right",
};

const VERTICAL_POSITION_CLASSES: Record<HeroSlideVerticalPosition, string> = {
  TOP: "justify-start",
  MIDDLE: "justify-center",
  BOTTOM: "justify-end",
};

// DISCOUNT slides never store a hand-typed link — general when neither
// targeting field is set, narrowed by category and/or brand otherwise.
function buildDiscountLink(slide: HeroSlide): string {
  const params = new URLSearchParams({ onSale: "true" });
  if (slide.discountCategoryId != null) params.set("categoryId", String(slide.discountCategoryId));
  if (slide.discountProductBrandId != null) {
    params.set("brandIds", String(slide.discountProductBrandId));
  }
  return `/shop?${params.toString()}`;
}

export function HeroSlider({
  slides,
  vehicleCatalog,
  garageVehicles,
  categories,
}: {
  slides: HeroSlide[];
  vehicleCatalog: VehicleCatalogEntry[];
  garageVehicles: GarageVehicle[];
  categories: Category[];
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Common.heroSlider");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Touch-swipe support — previously the only way to change slides on a
  // touch device was the arrow buttons, which are hidden below the `sm`
  // breakpoint (`hidden sm:flex`), and the 10px dots at the bottom, leaving
  // mobile visitors with no real way to navigate the slider at all. Only
  // the X coordinate is tracked (a horizontal swipe), not Y — a vertical
  // page-scroll gesture that happens to start over the hero shouldn't be
  // hijacked into a slide change.
  const touchStartXRef = useRef<number | null>(null);

  function handleTouchStart(event: React.TouchEvent) {
    touchStartXRef.current = event.touches[0].clientX;
    setPaused(true);
  }

  function handleTouchEnd(event: React.TouchEvent) {
    const startX = touchStartXRef.current;
    touchStartXRef.current = null;
    setPaused(false);
    if (startX == null || slides.length <= 1) return;

    const deltaX = event.changedTouches[0].clientX - startX;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;

    if (deltaX < 0) {
      setIndex((current) => (current + 1) % slides.length);
    } else {
      setIndex((current) => (current - 1 + slides.length) % slides.length);
    }
  }

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [slides.length, paused]);

  const slide = slides[index];
  const imageUrl = resolveMediaUrl(slide.imageUrl);

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative aspect-4/3 w-full overflow-hidden border-b border-border sm:aspect-video lg:aspect-21/9 lg:max-h-130"
    >
      {imageUrl ? (
        <Image src={imageUrl} alt="" fill priority={index === 0} className="object-cover" />
      ) : (
        <div className="size-full bg-muted" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      <div
        className={`absolute inset-0 flex flex-col px-4 py-8 sm:px-8 sm:py-12 lg:px-16 ${VERTICAL_POSITION_CLASSES[slide.verticalPosition]}`}
      >
        <div
          className={`mx-auto flex w-full max-w-6xl flex-col gap-4 ${TEXT_POSITION_CLASSES[slide.textPosition]}`}
        >
          <h1 className="max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            {slide.title[locale]}
          </h1>
          {slide.subtitle && (
            <p className="max-w-xl text-base text-white/90 sm:text-lg">{slide.subtitle[locale]}</p>
          )}

          {slide.type === "CTA" && slide.buttonLabel && slide.buttonLink && (
            <Link
              href={slide.buttonLink}
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              {slide.buttonLabel[locale]}
            </Link>
          )}

          {slide.type === "DISCOUNT" && slide.buttonLabel && (
            <Link
              href={buildDiscountLink(slide)}
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              {slide.buttonLabel[locale]}
            </Link>
          )}

          {slide.type === "VEHICLE_SEARCH" && (
            <VehicleSearchForm vehicleCatalog={vehicleCatalog} garageVehicles={garageVehicles} />
          )}
          {slide.type === "CATEGORY_FILTER" && <CategorySearchForm categories={categories} />}
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label={t("prevSlide")}
            onClick={() => setIndex((current) => (current - 1 + slides.length) % slides.length)}
            className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/30 p-2 text-white transition-colors hover:bg-black/50 sm:flex"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={t("nextSlide")}
            onClick={() => setIndex((current) => (current + 1) % slides.length)}
            className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/30 p-2 text-white transition-colors hover:bg-black/50 sm:flex"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={t("slideDot", { index: i + 1 })}
                onClick={() => setIndex(i)}
                // Padding gives each dot a ~30px tap target instead of the
                // visible dot's bare 10px — the visible size/spacing is
                // unchanged (the inner span below still renders at the
                // original size), only the actual hit area grew.
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
    </section>
  );
}
