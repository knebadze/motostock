import { getBrandsFromServer, getModelsFromServer } from "@/lib/api/server";
import { ModelsManager } from "@/components/admin/models/ModelsManager";

export default async function ModelsPage() {
  const [models, brands] = await Promise.all([getModelsFromServer(), getBrandsFromServer()]);

  return <ModelsManager initialModels={models} brands={brands} />;
}
