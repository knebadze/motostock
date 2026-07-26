import {
  getBrandsFromServer,
  getCategoriesFromServer,
  getModelsFromServer,
} from "@/lib/api/server";
import { ModelsManager } from "@/components/admin/models/ModelsManager";

export default async function ModelsPage() {
  const [models, brands, categories] = await Promise.all([
    getModelsFromServer(),
    getBrandsFromServer(),
    getCategoriesFromServer(),
  ]);

  return <ModelsManager initialModels={models} brands={brands} categories={categories} />;
}
