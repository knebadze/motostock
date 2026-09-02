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
  searchParams: Promise<{ onSale?: string; categoryId?: string; brandIds?: string }>;
}) {
  const { onSale, categoryId, brandIds } = await searchParams;
  const initialOnSale = onSale === "true";
  const parsedCategoryId = categoryId ? Number(categoryId) : undefined;
  const parsedBrandIds = brandIds
    ? brandIds
        .split(",")
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    : undefined;

  const [products, productsPage, garageVehicles] = await Promise.all([
    getShopProductsFromServer({
      categoryId: parsedCategoryId,
      brandIds: parsedBrandIds,
      onSale: initialOnSale,
    }),
    getShopProductsPageFromServer({
      categoryId: parsedCategoryId,
      brandIds: parsedBrandIds,
      onSale: initialOnSale,
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
    />
  );
}
