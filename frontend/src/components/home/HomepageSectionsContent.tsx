import {
  getFeaturedProductsFromServer,
  getFeaturedVehicleListingsFromServer,
  getOnSaleProductsFromServer,
  getOnSaleVehicleListingsFromServer,
  getPopularForVehicleFromServer,
  getPopularProductsFromServer,
  getPopularVehicleListingsFromServer,
  getRecentlyViewedFromServer,
  getRecommendedForMeFromServer,
} from "@/lib/api/server";
import type { Category } from "@/lib/api/categories";
import type { HomepageSection } from "@/lib/api/homepage-sections";
import { ProductsCarouselSection } from "@/components/home/ProductsCarouselSection";
import { VehicleListingsCarouselSection } from "@/components/home/VehicleListingsCarouselSection";
import { MixedCarouselSection } from "@/components/home/MixedCarouselSection";
import { CategoriesSection } from "@/components/home/CategoriesSection";

type Locale = "ka" | "en" | "ru";

// Split out of page.tsx so the below-the-fold carousels (up to ~8 further
// backend calls — one or two per active section) can be wrapped in its own
// <Suspense> boundary there, streaming in after the hero/LCP content instead
// of blocking the whole page's initial paint on every section's own fetch.
export async function HomepageSectionsContent({
  activeSections,
  topLevelCategories,
  selectedVehicleCatalogId,
  localeKey,
}: {
  activeSections: HomepageSection[];
  topLevelCategories: Category[];
  selectedVehicleCatalogId: string | undefined;
  localeKey: Locale;
}) {
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
        case "FEATURED_MIXED": {
          const [products, listings] = await Promise.all([
            getFeaturedProductsFromServer(section.productItemCount ?? 5),
            getFeaturedVehicleListingsFromServer(section.vehicleItemCount ?? 5),
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
      {sectionContent.map(({ key, node }) => (
        <div key={key}>{node}</div>
      ))}
    </>
  );
}
