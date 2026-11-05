import { getAdminProductBrandsPageFromServer, getCategoriesFromServer } from "@/lib/api/server";
import { ProductBrandsManager } from "@/components/admin/product-brands/ProductBrandsManager";

export default async function ProductBrandsPage() {
  const [initialData, categories] = await Promise.all([
    getAdminProductBrandsPageFromServer(),
    getCategoriesFromServer(),
  ]);

  return <ProductBrandsManager initialData={initialData} categories={categories} />;
}
