import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SELECTED_VEHICLE_COOKIE } from "@/lib/vehicle-selection";
import {
  getCategoriesFromServer,
  getMyGarageFromServer,
  getOnSaleProductsFromServer,
  getOnSaleVehicleListingsFromServer,
  getPopularForVehicleFromServer,
  getPopularProductsFromServer,
  getPopularVehicleListingsFromServer,
  getPublicHeroSlidesFromServer,
  getPublicHomepageSectionsFromServer,
  getRecentlyViewedFromServer,
  getRecommendedForMeFromServer,
  getVehicleCatalogFromServer,
} from "@/lib/api/server";
import { HeroSlider } from "@/components/home/HeroSlider";
import { ProductsCarouselSection } from "@/components/home/ProductsCarouselSection";
import { VehicleListingsCarouselSection } from "@/components/home/VehicleListingsCarouselSection";
import { MixedCarouselSection } from "@/components/home/MixedCarouselSection";
import { CategoriesSection } from "@/components/home/CategoriesSection";
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

  const slides = await getPublicHeroSlidesFromServer();
  const hasVehicleSearchSlide = slides.some((slide) => slide.type === "VEHICLE_SEARCH");
  const [vehicleCatalog, garageVehicles] = hasVehicleSearchSlide
    ? await Promise.all([getVehicleCatalogFromServer(), getMyGarageFromServer()])
    : [[], []];

  const sections = await getPublicHomepageSectionsFromServer();
  const activeSections = [...sections]
    .filter((section) => section.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Shared "shop-filter" vehicle pick (see vehicle-selection.ts) — read once
  // here for the POPULAR_FOR_VEHICLE section below, same cookie the item
  // detail/category pages already read.
  const selectedVehicleCatalogId = (await cookies()).get(SELECTED_VEHICLE_COOKIE)?.value;

  // Only fetched when actually needed — most homepage loads won't have a
  // CATEGORY_FILTER hero slide or an active CATEGORIES section configured,
  // so this stays a no-op by default.
  const needsCategories =
    slides.some((slide) => slide.type === "CATEGORY_FILTER") ||
    activeSections.some((section) => section.type === "CATEGORIES");
  const allCategories = needsCategories ? await getCategoriesFromServer() : [];
  const topLevelCategories = allCategories
    .filter((category) => category.parentId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const sectionContent = await Promise.all(
    activeSections.map(async (section) => {
      const title = section.title[localeKey];
      switch (section.type) {
        case "DISCOUNTED_PRODUCTS":
          return {
            key: section.id,
            node: (
              <ProductsCarouselSection
                title={title}
                products={await getOnSaleProductsFromServer(section.itemCount)}
              />
            ),
          };
        case "POPULAR_PRODUCTS":
          return {
            key: section.id,
            node: (
              <ProductsCarouselSection
                title={title}
                products={await getPopularProductsFromServer(section.itemCount)}
              />
            ),
          };
        case "DISCOUNTED_VEHICLES":
          return {
            key: section.id,
            node: (
              <VehicleListingsCarouselSection
                title={title}
                listings={await getOnSaleVehicleListingsFromServer(section.itemCount)}
              />
            ),
          };
        case "POPULAR_VEHICLES":
          return {
            key: section.id,
            node: (
              <VehicleListingsCarouselSection
                title={title}
                listings={await getPopularVehicleListingsFromServer(section.itemCount)}
              />
            ),
          };
        case "DISCOUNTED_MIXED": {
          const [products, listings] = await Promise.all([
            getOnSaleProductsFromServer(section.productItemCount ?? 5),
            getOnSaleVehicleListingsFromServer(section.vehicleItemCount ?? 5),
          ]);
          return {
            key: section.id,
            node: <MixedCarouselSection title={title} products={products} listings={listings} />,
          };
        }
        case "POPULAR_MIXED": {
          const [products, listings] = await Promise.all([
            getPopularProductsFromServer(section.productItemCount ?? 5),
            getPopularVehicleListingsFromServer(section.vehicleItemCount ?? 5),
          ]);
          return {
            key: section.id,
            node: <MixedCarouselSection title={title} products={products} listings={listings} />,
          };
        }
        case "CATEGORIES":
          return {
            key: section.id,
            node: (
              <CategoriesSection
                title={title}
                categories={topLevelCategories.slice(0, section.itemCount)}
                locale={localeKey}
              />
            ),
          };
        // Per-visitor, not global like every case above — renders nothing
        // (via ProductsCarouselSection's own empty-state) rather than
        // falling back to a generic list under a personalized heading when
        // there's no vehicle selected/no signal for this particular visitor.
        case "POPULAR_FOR_VEHICLE":
          return {
            key: section.id,
            node: selectedVehicleCatalogId ? (
              <ProductsCarouselSection
                title={title}
                products={await getPopularForVehicleFromServer(selectedVehicleCatalogId, section.itemCount)}
              />
            ) : null,
          };
        case "RECOMMENDED_FOR_YOU":
          return {
            key: section.id,
            node: (
              <ProductsCarouselSection
                title={title}
                products={await getRecommendedForMeFromServer(section.itemCount)}
              />
            ),
          };
        case "RECENTLY_VIEWED":
          return {
            key: section.id,
            node: (
              <ProductsCarouselSection
                title={title}
                products={await getRecentlyViewedFromServer(section.itemCount)}
              />
            ),
          };
      }
    }),
  );

  return (
    <>
      {slides.length > 0 ? (
        <HeroSlider
          slides={slides}
          vehicleCatalog={vehicleCatalog}
          garageVehicles={garageVehicles}
          categories={allCategories}
        />
      ) : (
        // Fallback for before any slide is configured (or all disabled) — the
        // original static hero, unchanged, so the homepage is never empty.
        <section className="border-b border-border bg-muted/40">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-24 sm:px-6 lg:px-8">
            <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
              {t.rich("heroTitle", {
                hl: (chunks) => <span className="text-primary">{chunks}</span>,
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

      {sectionContent.map(({ key, node }) => (
        <div key={key}>{node}</div>
      ))}

      <HomeInfoCardsSection />
    </>
  );
}
