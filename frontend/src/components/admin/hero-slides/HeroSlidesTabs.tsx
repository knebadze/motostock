"use client";

import { Tabs } from "@/components/shared/Tabs";
import type { HeroSlide } from "@/lib/api/hero-slides";
import type { HomepageProductSlider } from "@/lib/api/homepage-product-sliders";
import type { Category } from "@/lib/api/categories";
import type { ProductBrand } from "@/lib/api/product-brands";
import { HeroSlidesManager } from "./HeroSlidesManager";
import { HomepageProductSlidersManager } from "./HomepageProductSlidersManager";

export function HeroSlidesTabs({
  slides,
  categories,
  productBrands,
  productSliders,
}: {
  slides: HeroSlide[];
  categories: Category[];
  productBrands: ProductBrand[];
  productSliders: HomepageProductSlider[];
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">მთავარი გვერდის სერვისი</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        მთავარი გვერდის ვიზუალური კონტენტის მართვა — ზედა სლაიდერი და ქვემოთ გამოსაჩენი პროდუქტის
        სლაიდერები.
      </p>

      <div className="mt-6">
        <Tabs
          tabs={[
            {
              key: "hero",
              label: "მთავარი სლაიდერი",
              content: (
                <HeroSlidesManager
                  initialSlides={slides}
                  categories={categories}
                  productBrands={productBrands}
                />
              ),
            },
            {
              key: "product-sliders",
              label: "პროდუქტის სლაიდერები",
              content: <HomepageProductSlidersManager initialProductSliders={productSliders} />,
            },
          ]}
        />
      </div>
    </div>
  );
}
