import { Suspense } from "react";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SELECTED_VEHICLE_COOKIE } from "@/lib/vehicle-selection";
import {
  getCategoriesFromServer,
  getMyGarageFromServer,
  getPublicHeroSlidesFromServer,
  getPublicHomepageSectionsFromServer,
  getVehicleSearchOptionsFromServer,
} from "@/lib/api/server";
import { HeroSlider } from "@/components/home/HeroSlider";
import { HomepageSectionContent } from "@/components/home/HomepageSectionsContent";
import { HomeSectionsSkeleton } from "@/components/home/HomeSectionsSkeleton";
import { HomeInfoCardsSection } from "@/components/home/HomeInfoCardsSection";

type Locale = "ka" | "en" | "ru";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const localeKey = locale as Locale;
  const t = await getTranslations({ locale, namespace: "Home" });

  // Neither of these depends on the other's result — fetched in parallel
  // instead of two sequential round-trips before the hero/LCP content can
  // even start rendering.
  const [slides, sections] = await Promise.all([
    getPublicHeroSlidesFromServer(),
    getPublicHomepageSectionsFromServer(),
  ]);
  const hasVehicleSearchSlide = slides.some((slide) => slide.type === "VEHICLE_SEARCH");
  const [vehicleCatalog, garageVehicles] = hasVehicleSearchSlide
    ? await Promise.all([getVehicleSearchOptionsFromServer(), getMyGarageFromServer()])
    : [[], []];

  const activeSections = [...sections]
    .filter((section) => section.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Shared "shop-filter" vehicle pick (see vehicle-selection.ts) — read once
  // here for the POPULAR_FOR_VEHICLE section below, same cookie the item
  // detail/category pages already read.
  const selectedVehicleCatalogId = (await cookies()).get(SELECTED_VEHICLE_COOKIE)?.value;

  // Only fetched when actually needed — most homepage loads won't have a
  // CATEGORY_FILTER hero slide or an active CATEGORIES section configured,
  // so this stays a no-op by default. Kept here (not deferred into the
  // Suspense boundary below) since a CATEGORY_FILTER slide needs it for the
  // above-the-fold hero itself.
  const needsCategories =
    slides.some((slide) => slide.type === "CATEGORY_FILTER") ||
    activeSections.some((section) => section.type === "CATEGORIES");
  const allCategories = needsCategories ? await getCategoriesFromServer() : [];
  const topLevelCategories = allCategories
    .filter((category) => category.parentId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      {slides.length > 0 ? (
        <>
          {/* HeroSlider's own per-slide heading is an <h2> now, not <h1> —
              a POSTER-type slide intentionally renders no heading of its own
              at all (see HeroSlider.tsx), which used to leave the whole
              homepage with zero <h1> whenever an admin picked one as the
              first/only slide. This one is always present regardless of
              which slide is showing or what type it is. */}
          <h1 className="sr-only">{t("seoHeading")}</h1>
          <HeroSlider
            slides={slides}
            vehicleCatalog={vehicleCatalog}
            garageVehicles={garageVehicles}
            categories={allCategories}
          />
        </>
      ) : (
        // Fallback for before any slide is configured (or all disabled) — the
        // original static hero, unchanged, so the homepage is never empty.
        <section className="border-b border-border bg-muted/40">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-24 sm:px-6 lg:px-8">
            <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
              {t.rich("heroTitle", {
                hl: (chunks) => <span className="text-primary-text">{chunks}</span>,
              })}
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              {t("heroSubtitle")}
            </p>
            <Link
              href="/catalog"
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              {t("browseCatalog")}
            </Link>
          </div>
        </section>
      )}

      {/* Below-the-fold — one or two backend calls per active section. Each
          section streams in behind its own boundary, neither blocking the
          hero/LCP content above nor waiting on the other sections (see
          HomepageSectionsContent.tsx). */}
      {activeSections.map((section) => (
        <div key={section.id}>
          <Suspense
            fallback={
              <HomeSectionsSkeleton
                count={section.type === "POPULAR_FOR_VEHICLE" && !selectedVehicleCatalogId ? 0 : 1}
              />
            }
          >
            <HomepageSectionContent
              section={section}
              topLevelCategories={topLevelCategories}
              selectedVehicleCatalogId={selectedVehicleCatalogId}
              localeKey={localeKey}
            />
          </Suspense>
        </div>
      ))}

      <HomeInfoCardsSection />
    </>
  );
}
