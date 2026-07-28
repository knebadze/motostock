import { notFound } from "next/navigation";
import {
  getCategoriesFromServer,
  getLookupItemsFromServer,
  getProductFromServer,
  getVehicleCatalogFromServer,
} from "@/lib/api/server";
import { ProductForm } from "@/components/admin/products/ProductForm";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories, sizes, colors, conditions, statuses, vehicleCatalog] =
    await Promise.all([
      getProductFromServer(Number(id)),
      getCategoriesFromServer(),
      getLookupItemsFromServer("sizes"),
      getLookupItemsFromServer("colors"),
      getLookupItemsFromServer("conditions"),
      getLookupItemsFromServer("listing-statuses"),
      getVehicleCatalogFromServer(),
    ]);

  if (!product) {
    notFound();
  }

  return (
    <ProductForm
      categories={categories}
      sizes={sizes}
      colors={colors}
      conditions={conditions}
      statuses={statuses}
      vehicleCatalog={vehicleCatalog}
      product={product}
    />
  );
}
