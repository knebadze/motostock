import {
  getCategoriesFromServer,
  getCompatibilityFromServer,
  getProductsFromServer,
  getVehicleCatalogFromServer,
} from "@/lib/api/server";
import { CompatibilityManager } from "@/components/admin/compatibility/CompatibilityManager";

export default async function CompatibilityPage() {
  const [items, categories, products, vehicleCatalog] = await Promise.all([
    getCompatibilityFromServer(),
    getCategoriesFromServer(),
    getProductsFromServer(),
    getVehicleCatalogFromServer(),
  ]);

  return (
    <CompatibilityManager
      initialItems={items}
      categories={categories}
      products={products}
      vehicleCatalog={vehicleCatalog}
    />
  );
}
