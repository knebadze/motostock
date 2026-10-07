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

// One below-the-fold homepage section — page.tsx wraps each in its own
// <Suspense> boundary, so every carousel streams in as soon as its own
// query (one or two backend calls) finishes. They used to be rendered
// together behind a single boundary, so the whole block waited for the
// slowest section (typically a personalized one).
export async function HomepageSectionContent({
  section,
  topLevelCategories,
  selectedVehicleCatalogId,
  localeKey,
}: {
  section: HomepageSection;
  topLevelCategories: Category[];
  selectedVehicleCatalogId: string | undefined;
  localeKey: Locale;
}) {
  const title = section.title[localeKey];
  switch (section.type) {
    case "DISCOUNTED_PRODUCTS":
      return (
        <ProductsCarouselSection title={title} products={await getOnSaleProductsFromServer(section.itemCount)} />
      );
    case "POPULAR_PRODUCTS":
      return (
        <ProductsCarouselSection title={title} products={await getPopularProductsFromServer(section.itemCount)} />
      );
    case "DISCOUNTED_VEHICLES":
      return (
        <VehicleListingsCarouselSection
          title={title}
          listings={await getOnSaleVehicleListingsFromServer(section.itemCount)}
        />
      );
    case "POPULAR_VEHICLES":
      return (
        <VehicleListingsCarouselSection
          title={title}
          listings={await getPopularVehicleListingsFromServer(section.itemCount)}
        />
      );
    case "DISCOUNTED_MIXED": {
      const [products, listings] = await Promise.all([
        getOnSaleProductsFromServer(section.productItemCount ?? 5),
        getOnSaleVehicleListingsFromServer(section.vehicleItemCount ?? 5),
      ]);
      return <MixedCarouselSection title={title} products={products} listings={listings} />;
    }
    case "POPULAR_MIXED": {
      const [products, listings] = await Promise.all([
        getPopularProductsFromServer(section.productItemCount ?? 5),
        getPopularVehicleListingsFromServer(section.vehicleItemCount ?? 5),
      ]);
      return <MixedCarouselSection title={title} products={products} listings={listings} />;
    }
    case "FEATURED_MIXED": {
      const [products, listings] = await Promise.all([
        getFeaturedProductsFromServer(section.productItemCount ?? 5),
        getFeaturedVehicleListingsFromServer(section.vehicleItemCount ?? 5),
      ]);
      return <MixedCarouselSection title={title} products={products} listings={listings} />;
    }
    case "CATEGORIES":
      return (
        <CategoriesSection
          title={title}
          categories={topLevelCategories.slice(0, section.itemCount)}
          locale={localeKey}
        />
      );
    // Per-visitor, not global like every case above — renders nothing
    // (via ProductsCarouselSection's own empty-state) rather than
    // falling back to a generic list under a personalized heading when
    // there's no vehicle selected/no signal for this particular visitor.
    case "POPULAR_FOR_VEHICLE":
      return selectedVehicleCatalogId ? (
        <ProductsCarouselSection
          title={title}
          products={await getPopularForVehicleFromServer(selectedVehicleCatalogId, section.itemCount)}
        />
      ) : null;
    case "RECOMMENDED_FOR_YOU":
      return (
        <ProductsCarouselSection title={title} products={await getRecommendedForMeFromServer(section.itemCount)} />
      );
    case "RECENTLY_VIEWED":
      return (
        <ProductsCarouselSection title={title} products={await getRecentlyViewedFromServer(section.itemCount)} />
      );
  }
}
