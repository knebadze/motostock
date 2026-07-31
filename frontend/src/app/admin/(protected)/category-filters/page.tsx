import { getCategoriesFromServer } from "@/lib/api/server";
import { CategoryFiltersManager } from "@/components/admin/category-filters/CategoryFiltersManager";

export default async function CategoryFiltersPage() {
  const categories = await getCategoriesFromServer();

  return <CategoryFiltersManager categories={categories} />;
}
