import { getAttributesFromServer, getCategoriesFromServer } from "@/lib/api/server";
import { AttributesManager } from "@/components/admin/attributes/AttributesManager";

export default async function AttributesPage() {
  const [attributes, categories] = await Promise.all([
    getAttributesFromServer(),
    getCategoriesFromServer(),
  ]);

  return <AttributesManager initialAttributes={attributes} categories={categories} />;
}
