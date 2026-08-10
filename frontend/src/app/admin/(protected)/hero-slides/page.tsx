import {
  getCategoriesFromServer,
  getHeroSlidesFromServer,
  getHomepageSectionsFromServer,
  getProductBrandsFromServer,
} from "@/lib/api/server";
import { HeroSlidesTabs } from "@/components/admin/hero-slides/HeroSlidesTabs";

export default async function HeroSlidesPage() {
  const [slides, categories, productBrands, sections] = await Promise.all([
    getHeroSlidesFromServer(),
    getCategoriesFromServer(),
    getProductBrandsFromServer(),
    getHomepageSectionsFromServer(),
  ]);

  return (
    <HeroSlidesTabs
      slides={slides}
      categories={categories}
      productBrands={productBrands}
      sections={sections}
    />
  );
}
