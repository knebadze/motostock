import { getAttributesFromServer, getCategoriesFromServer, getUnitsFromServer } from "@/lib/api/server";
import { AttributesManager } from "@/components/admin/attributes/AttributesManager";

export default async function AttributesPage() {
  const [attributes, categories, units] = await Promise.all([
    getAttributesFromServer(),
    getCategoriesFromServer(),
    getUnitsFromServer(),
  ]);

  return <AttributesManager initialAttributes={attributes} categories={categories} units={units} />;
}
