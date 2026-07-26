import { getCategoriesFromServer } from "@/lib/api/server";
import { CategoriesManager } from "@/components/admin/categories/CategoriesManager";

export default async function CategoriesPage() {
  const categories = await getCategoriesFromServer();

  return <CategoriesManager initialCategories={categories} />;
}
