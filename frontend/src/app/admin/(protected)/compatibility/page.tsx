import {
  getCategoriesFromServer,
  getCompatibilityFromServer,
} from "@/lib/api/server";
import { CompatibilityManager } from "@/components/admin/compatibility/CompatibilityManager";

export default async function CompatibilityPage() {
  const [initialData, categories] = await Promise.all([
    getCompatibilityFromServer(),
    getCategoriesFromServer(),
  ]);

  return (
    <CompatibilityManager
      initialData={initialData}
      categories={categories}
    />
  );
}
