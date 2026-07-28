import { getCategoriesFromServer, getProductBrandsFromServer } from "@/lib/api/server";
import { ProductBrandsManager } from "@/components/admin/product-brands/ProductBrandsManager";

export default async function ProductBrandsPage() {
  const [productBrands, categories] = await Promise.all([
    getProductBrandsFromServer(),
    getCategoriesFromServer(),
  ]);

  return <ProductBrandsManager initialProductBrands={productBrands} categories={categories} />;
}
