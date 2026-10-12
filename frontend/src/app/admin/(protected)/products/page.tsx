import {
  getAdminProductsFromServer,
  getCategoriesFromServer,
  getLookupItemsFromServer,
  getProductBrandsFromServer,
  getTagsFromServer,
} from "@/lib/api/server";
import { ProductsManager } from "@/components/admin/products/ProductsManager";

export default async function ProductsPage() {
  const [products, categories, productBrands, sizes, colors, conditions, statuses, tags] =
    await Promise.all([
      getAdminProductsFromServer(),
      getCategoriesFromServer(),
      getProductBrandsFromServer(),
      getLookupItemsFromServer("sizes"),
      getLookupItemsFromServer("colors"),
      getLookupItemsFromServer("conditions"),
      getLookupItemsFromServer("listing-statuses"),
      getTagsFromServer(),
    ]);

  return (
    <ProductsManager
      initialData={products}
      categories={categories}
      productBrands={productBrands}
      sizes={sizes}
      colors={colors}
      conditions={conditions}
      statuses={statuses}
      tags={tags}
    />
  );
}
