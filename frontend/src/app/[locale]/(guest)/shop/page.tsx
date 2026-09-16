import type { Metadata } from "next";
import {
  getMyGarageFromServer,
  getShopProductsFromServer,
  getShopProductsPageFromServer,
} from "@/lib/api/server";
import { ShopAllProductsPage } from "@/components/shop/ShopAllProductsPage";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ShopRoutePage({
  searchParams,
}: {
  searchParams: Promise<{ onSale?: string; categoryId?: string; brandIds?: string; eventId?: string }>;
}) {
  const { onSale, categoryId, brandIds, eventId } = await searchParams;
  const initialOnSale = onSale === "true";
  const parsedCategoryId = categoryId ? Number(categoryId) : undefined;
  const parsedBrandIds = brandIds
    ? brandIds
        .split(",")
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    : undefined;
  // Set by the homepage hero-slider's event-scoped DISCOUNT slides (see
  // HeroSlider.tsx's buildDiscountLink) and the admin bulk-discounts panel's
  // "ნახვა მაღაზიაში" link — fixed for this page load, not a togglable UI
  // control, same treatment as initialOnSale below.
  const parsedEventId = eventId ? Number(eventId) : undefined;

  const [products, productsPage, garageVehicles] = await Promise.all([
    getShopProductsFromServer({
      categoryId: parsedCategoryId,
      brandIds: parsedBrandIds,
      onSale: initialOnSale,
      bulkDiscountEventId: parsedEventId,
    }),
    getShopProductsPageFromServer({
      categoryId: parsedCategoryId,
      brandIds: parsedBrandIds,
      onSale: initialOnSale,
      bulkDiscountEventId: parsedEventId,
    }),
    getMyGarageFromServer(),
  ]);

  return (
    <ShopAllProductsPage
      products={products}
      initialData={productsPage}
      garageVehicles={garageVehicles}
      initialOnSale={initialOnSale}
      initialCategoryId={parsedCategoryId}
      initialBrandIds={parsedBrandIds}
      initialEventId={parsedEventId}
    />
  );
}
