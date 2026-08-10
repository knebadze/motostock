import {
  getCategoriesFromServer,
  getHeroSlidesFromServer,
  getHomepageProductSlidersFromServer,
  getProductBrandsFromServer,
} from "@/lib/api/server";
import { HeroSlidesTabs } from "@/components/admin/hero-slides/HeroSlidesTabs";

export default async function HeroSlidesPage() {
  const [slides, categories, productBrands, productSliders] = await Promise.all([
    getHeroSlidesFromServer(),
    getCategoriesFromServer(),
    getProductBrandsFromServer(),
    getHomepageProductSlidersFromServer(),
  ]);

  return (
    <HeroSlidesTabs
      slides={slides}
      categories={categories}
      productBrands={productBrands}
      productSliders={productSliders}
    />
  );
}
