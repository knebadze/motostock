import { getCategoriesFromServer, getHeroSlidesFromServer, getProductBrandsFromServer } from "@/lib/api/server";
import { HeroSlidesManager } from "@/components/admin/hero-slides/HeroSlidesManager";

export default async function HeroSlidesPage() {
  const [slides, categories, productBrands] = await Promise.all([
    getHeroSlidesFromServer(),
    getCategoriesFromServer(),
    getProductBrandsFromServer(),
  ]);

  return (
    <HeroSlidesManager initialSlides={slides} categories={categories} productBrands={productBrands} />
  );
}
