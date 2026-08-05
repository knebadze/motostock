"use client";

import { Tabs } from "@/components/shared/Tabs";
import type { Category } from "@/lib/api/categories";
import { BulkProductDiscountsPanel } from "../bulk-product-discounts/BulkProductDiscountsPanel";
import { BulkVehicleListingDiscountsPanel } from "../bulk-vehicle-listing-discounts/BulkVehicleListingDiscountsPanel";

export function BulkDiscountsTabs({ categories }: { categories: Category[] }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">მასობრივი ფასდაკლებები</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        აირჩიეთ კატეგორია, დაფილტრეთ და მონიშნეთ ჩექბოქსებით ზუსტად ის ვარიანტები/განცხადებები,
        რომლებზეც გსურთ ფასდაკლების გამოყენება — ცალკე პროდუქტებისთვის და ტრანსპორტისთვის.
      </p>

      <div className="mt-6">
        <Tabs
          tabs={[
            {
              key: "products",
              label: "პროდუქტები",
              content: <BulkProductDiscountsPanel categories={categories} />,
            },
            {
              key: "vehicles",
              label: "ტრანსპორტი",
              content: <BulkVehicleListingDiscountsPanel categories={categories} />,
            },
          ]}
        />
      </div>
    </div>
  );
}
