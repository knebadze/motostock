import {
  getCategoriesFromServer,
  getLookupItemsFromServer,
  getVehicleCatalogFromServer,
} from "@/lib/api/server";
import { ProductForm } from "@/components/admin/products/ProductForm";

export default async function NewProductPage() {
  const [categories, sizes, colors, conditions, statuses, vehicleCatalog] = await Promise.all([
    getCategoriesFromServer(),
    getLookupItemsFromServer("sizes"),
    getLookupItemsFromServer("colors"),
    getLookupItemsFromServer("conditions"),
    getLookupItemsFromServer("listing-statuses"),
    getVehicleCatalogFromServer(),
  ]);

  return (
    <ProductForm
      categories={categories}
      sizes={sizes}
      colors={colors}
      conditions={conditions}
      statuses={statuses}
      vehicleCatalog={vehicleCatalog}
      product={null}
    />
  );
}
