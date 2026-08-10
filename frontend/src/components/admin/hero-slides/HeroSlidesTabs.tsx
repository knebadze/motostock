"use client";

import { Tabs } from "@/components/shared/Tabs";
import type { HeroSlide } from "@/lib/api/hero-slides";
import type { HomepageSection } from "@/lib/api/homepage-sections";
import type { Category } from "@/lib/api/categories";
import type { ProductBrand } from "@/lib/api/product-brands";
import { HeroSlidesManager } from "./HeroSlidesManager";
import { HomepageSectionsManager } from "./HomepageSectionsManager";

export function HeroSlidesTabs({
  slides,
  categories,
  productBrands,
  sections,
}: {
  slides: HeroSlide[];
  categories: Category[];
  productBrands: ProductBrand[];
  sections: HomepageSection[];
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">მთავარი გვერდის სერვისი</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        მთავარი გვერდის ვიზუალური კონტენტის მართვა — ზედა სლაიდერი და ქვემოთ გამოსაჩენი სექციები.
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
              key: "sections",
              label: "გვერდის სექციები",
              content: <HomepageSectionsManager initialSections={sections} />,
            },
          ]}
        />
      </div>
    </div>
  );
}
