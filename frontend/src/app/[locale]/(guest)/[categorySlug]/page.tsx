import { notFound } from "next/navigation";
import {
  getCategoriesFromServer,
  getProductsFromServer,
  getVehicleListingsFromServer,
} from "@/lib/api/server";
import { getRootCategory } from "@/lib/categories-tree";
import { ProductShopPage } from "@/components/shop/ProductShopPage";
import { VehicleShopPage } from "@/components/shop/VehicleShopPage";

const VEHICLE_ROOT_CATEGORY_SLUG = "transport";

export default async function CategoryShopPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = await params;

  const categories = await getCategoriesFromServer();
  const category = categories.find((item) => item.slug === categorySlug);
  if (!category) {
    notFound();
  }

  const root = getRootCategory(categories, category.id);

  if (root?.slug === VEHICLE_ROOT_CATEGORY_SLUG) {
    const listings = await getVehicleListingsFromServer(category.id);
    return <VehicleShopPage category={category} listings={listings} />;
  }

  const products = await getProductsFromServer(category.id);
  return <ProductShopPage category={category} products={products} />;
}
