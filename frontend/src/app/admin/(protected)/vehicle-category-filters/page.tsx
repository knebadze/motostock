import { getCategoriesFromServer } from "@/lib/api/server";
import { VehicleCategoryFiltersManager } from "@/components/admin/vehicle-category-filters/VehicleCategoryFiltersManager";

export default async function VehicleCategoryFiltersPage() {
  const categories = await getCategoriesFromServer();

  return <VehicleCategoryFiltersManager categories={categories} />;
}
