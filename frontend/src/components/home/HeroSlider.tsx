"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { resolveMediaUrl } from "@/lib/api/client";
import type { HeroSlide, HeroSlideTextPosition, HeroSlideVerticalPosition } from "@/lib/api/hero-slides";
import type { GarageVehicle, VehicleSearchOption } from "@/lib/api/vehicle-catalog";
import type { Category } from "@/lib/api/categories";
import { VEHICLE_ROOT_CATEGORY_SLUG } from "@/lib/categories-tree";
import { formatDate } from "@/lib/format";
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

// DISCOUNT slides never store a hand-typed link. An event-scoped slide
// (bulkDiscountEvent set) always wins — its own scoped listing page is the
// whole point of that slide, so it's checked first. A promo-code-linked
// slide comes next, deliberately WITHOUT onSale=true — a promo code creates
// no discount rows at all (it's a declarative, checkout-time rule, see
// promo-code.prisma), so filtering by "currently on sale" would show
// whatever else happens to be discounted, not what the code actually
// applies to (a code with no category, i.e. "every product," previously
// showed only the handful of items something unrelated had discounted).
// Neither set: general discount page, narrowed by category and/or brand
// when those are set.
function buildDiscountLink(slide: HeroSlide): string {
  if (slide.bulkDiscountEvent) {
    const path =
      slide.bulkDiscountEvent.targetType === "VEHICLE_LISTING"
        ? `/${VEHICLE_ROOT_CATEGORY_SLUG}`
        : "/shop";
    return `${path}?eventId=${slide.bulkDiscountEvent.id}`;
  }
  if (slide.promoCode) {
    if (slide.promoCode.domain === "VEHICLE") {
      return slide.promoCode.category ? `/${slide.promoCode.category.slug}` : `/${VEHICLE_ROOT_CATEGORY_SLUG}`;
    }
    return slide.promoCode.category ? `/shop?categoryId=${slide.promoCode.category.id}` : "/shop";
  }

  const params = new URLSearchParams({ onSale: "true" });
  if (slide.discountCategoryId != null) params.set("categoryId", String(slide.discountCategoryId));
  if (slide.discountProductBrandId != null) {
    params.set("brandIds", String(slide.discountProductBrandId));
  }
  return `/shop?${params.toString()}`;
}

// Descriptive text for a promo code's scope, since its slide's button link
// can't itself communicate "which category" the way an active-discount-row
// filter's result set would — see buildDiscountLink's comment. `null` means
// "applies to everything," shown as a localized "all products"/"all
// vehicles" phrase instead of a category name.
function promoCodeScopeText(
  promoCode: NonNullable<HeroSlide["promoCode"]>,
  locale: "ka" | "en" | "ru",
  t: ReturnType<typeof useTranslations>,
): string {
  if (!promoCode.category) {
    return promoCode.domain === "VEHICLE" ? t("promoCodeScopeAllVehicles") : t("promoCodeScopeAllProducts");
  }
  const categoryName = promoCode.category.name[locale];
  return promoCode.productBrand ? `${categoryName} · ${promoCode.productBrand.name}` : categoryName;
}

export function HeroSlider({
  slides,
  vehicleCatalog,
  garageVehicles,
  categories,
}: {
  slides: HeroSlide[];
  vehicleCatalog: VehicleSearchOption[];
  garageVehicles: GarageVehicle[];
  categories: Category[];
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Common.heroSlider");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Pause/play (WCAG 2.2.2): the shopper's explicit choice; until they make
  // one, autoplay is off for anyone with the OS "reduce motion" setting.
  const reducedMotion = usePrefersReducedMotion();
  const [userStopped, setUserStopped] = useState<boolean | null>(null);
  const autoplayStopped = userStopped ?? reducedMotion;
  // Set to the current slide's index when focus enters the slider (e.g. the
  // shopper starts filling the vehicle-search form) — autoplay holds while
  // that slide is still showing, so it isn't swapped out mid-input. Any
  // slide change (swipe/dots/arrows) releases it.
  const [focusHoldIndex, setFocusHoldIndex] = useState<number | null>(null);
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

  const heldForInput = focusHoldIndex === index;

  // Restarts on every slide change (index in the deps), so a manual swipe
  // gets a full AUTOPLAY_MS before the next automatic advance.
  useEffect(() => {
    if (slides.length <= 1 || paused || heldForInput || autoplayStopped) return;
    const timer = setInterval(() => {
      // Not while the tab is hidden — no one sees it, and each change would
      // start loading the next slide's image for nothing.
      if (document.visibilityState === "hidden") return;
      setIndex((current) => (current + 1) % slides.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [slides.length, paused, heldForInput, index, autoplayStopped]);

  const slide = slides[index];
  const imageUrl = resolveMediaUrl(slide.imageUrl);
  // On phones a 4:3 box (~270px tall at 360px wide) can't fit the stacked
  // vehicle-search/category form, and overflow-hidden clipped its button.
  // When the slider has any form slide, phones get one shared min-height
  // for every slide (so autoplay doesn't make the page jump between slide
  // types), and a form slide's content is in normal flow so it can grow
  // past it if needed (e.g. with the garage picker). sm+ is unchanged.
  const hasFormSlide = slides.some((item) => item.type === "VEHICLE_SEARCH" || item.type === "CATEGORY_FILTER");
  const isFormSlide = slide.type === "VEHICLE_SEARCH" || slide.type === "CATEGORY_FILTER";

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("regionLabel")}
      // Hover-pause for a real mouse only: on phones a tap fires emulated
      // mouseenter (after touchend) with no mouseleave ever following, which
      // used to stop autoplay for good after the first touch.
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setPaused(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setPaused(false);
      }}
      onFocusCapture={() => setFocusHoldIndex(index)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full overflow-hidden border-b border-border sm:aspect-video sm:min-h-0 lg:aspect-21/9 lg:max-h-130 ${
        hasFormSlide ? "min-h-[34rem]" : "aspect-4/3"
      }`}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          fill
          priority={index === 0}
          // Full viewport width at every breakpoint (this section has no
          // max-width wrapper) — without this, Next.js defaults to treating
          // the image as if it could be as wide as the *source* image and
          // serves an oversized variant on mobile, directly inflating LCP.
          sizes="100vw"
          className="object-cover"
        />
      ) : (
        <div className="size-full bg-muted" />
      )}

      {/* POSTER is just the image — no dimming overlay, no title/subtitle/
          button/form. The image (a poster/banner the admin uploads) already
          carries its own text, so overlaying more on top of it would only
          clash with it. title still exists on this slide row (required at
          the DB level like every other type) but is an admin-list-only
          label, deliberately not rendered here. */}
      {slide.type !== "POSTER" && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

          <div
            className={`${isFormSlide ? "relative min-h-[34rem] sm:absolute sm:min-h-0" : "absolute"} inset-0 flex flex-col px-4 py-8 sm:px-8 sm:py-12 lg:px-16 ${VERTICAL_POSITION_CLASSES[slide.verticalPosition]}`}
          >
            <div
              className={`mx-auto flex w-full max-w-6xl flex-col gap-4 ${TEXT_POSITION_CLASSES[slide.textPosition]}`}
            >
              {/* h2, not h1 — the page itself now always renders its own
                  stable <h1> (see [locale]/page.tsx), since this per-slide
                  heading is conditional (absent entirely for POSTER slides)
                  and changes with whichever slide is currently showing. */}
              <h2 className="max-w-2xl text-2xl font-extrabold tracking-tight text-white sm:text-5xl">
                {slide.title[locale]}
              </h2>
              {slide.type === "DISCOUNT" && slide.bulkDiscountEvent && (
                <span className="w-fit rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
                  {t("discountBadge", {
                    percent: slide.bulkDiscountEvent.discountPercent,
                    startDate: formatDate(slide.bulkDiscountEvent.startDate),
                    endDate: formatDate(slide.bulkDiscountEvent.endDate),
                  })}
                </span>
              )}
              {slide.type === "DISCOUNT" && !slide.bulkDiscountEvent && slide.promoCode && (
                <span className="w-fit rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
                  {t("promoCodeBadge", {
                    percent: slide.promoCode.discountPercent,
                    code: slide.promoCode.code,
                    scope: promoCodeScopeText(slide.promoCode, locale, t),
                    startDate: formatDate(slide.promoCode.startDate),
                    endDate: formatDate(slide.promoCode.endDate),
                  })}
                </span>
              )}
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
        </>
      )}

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

          <button
            type="button"
            onClick={() => setUserStopped(!autoplayStopped)}
            aria-label={autoplayStopped ? t("play") : t("pause")}
            aria-pressed={autoplayStopped}
            className="absolute bottom-3 right-3 z-10 flex size-8 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-3.5" aria-hidden>
                {autoplayStopped ? <path d="M8 5v14l11-7z" /> : <path d="M7 5h4v14H7zM13 5h4v14h-4z" />}
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
