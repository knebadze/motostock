import { getCategoriesFromServer, getProductsFromServer } from "@/lib/api/server";
import { ProductsManager } from "@/components/admin/products/ProductsManager";

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([
    getProductsFromServer(),
    getCategoriesFromServer(),
  ]);

  return <ProductsManager initialProducts={products} categories={categories} />;
}
