import { getCategoriesFromServer, getPromoCodesFromServer } from "@/lib/api/server";
import { PromoCodesTabs } from "@/components/admin/promo-codes/PromoCodesTabs";

export default async function PromoCodesPage() {
  const [productPromoCodes, vehiclePromoCodes, categories] = await Promise.all([
    getPromoCodesFromServer("PRODUCT"),
    getPromoCodesFromServer("VEHICLE"),
    getCategoriesFromServer(),
  ]);

  return (
    <PromoCodesTabs
      productPromoCodes={productPromoCodes}
      vehiclePromoCodes={vehiclePromoCodes}
      categories={categories}
    />
  );
}
