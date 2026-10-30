import {
  getAdminModelsPageFromServer,
  getBrandsFromServer,
  getCategoriesFromServer,
} from "@/lib/api/server";
import { ModelsManager } from "@/components/admin/models/ModelsManager";

export default async function ModelsPage() {
  const [initialData, brands, categories] = await Promise.all([
    getAdminModelsPageFromServer(),
    getBrandsFromServer(),
    getCategoriesFromServer(),
  ]);

  return <ModelsManager initialData={initialData} brands={brands} categories={categories} />;
}
