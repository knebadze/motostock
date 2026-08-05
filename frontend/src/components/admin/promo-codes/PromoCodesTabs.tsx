"use client";

import { Tabs } from "@/components/shared/Tabs";
import type { PromoCode } from "@/lib/api/promo-codes";
import type { Category } from "@/lib/api/categories";
import { PromoCodesManager } from "./PromoCodesManager";

export function PromoCodesTabs({
  productPromoCodes,
  vehiclePromoCodes,
  categories,
}: {
  productPromoCodes: PromoCode[];
  vehiclePromoCodes: PromoCode[];
  categories: Category[];
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">პრომოკოდები</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        მომხმარებლის მიერ შესატანი კოდები, რომლებიც პროცენტულ ფასდაკლებას ანიჭებს — ან ყველა
        პროდუქტზე/ტრანსპორტზე, ან კატეგორია/ბრენდი/მოდელი/მახასიათებლით დაზუსტებულ ნაწილზე. ცალკე
        პროდუქტებისთვის და ტრანსპორტისთვის.
      </p>

      <div className="mt-6">
        <Tabs
          tabs={[
            {
              key: "products",
              label: "პროდუქტები",
              content: (
                <PromoCodesManager
                  domain="PRODUCT"
                  initialPromoCodes={productPromoCodes}
                  categories={categories}
                />
              ),
            },
            {
              key: "vehicles",
              label: "ტრანსპორტი",
              content: (
                <PromoCodesManager
                  domain="VEHICLE"
                  initialPromoCodes={vehiclePromoCodes}
                  categories={categories}
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
