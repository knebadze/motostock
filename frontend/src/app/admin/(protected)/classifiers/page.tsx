import { getLookupItemsFromServer } from "@/lib/api/server";
import { LOOKUP_TYPES } from "@/config/lookup-types";
import { ClassifiersManager } from "@/components/admin/lookups/ClassifiersManager";

export default async function ClassifiersPage() {
  const items = await Promise.all(
    LOOKUP_TYPES.map((lookupType) => getLookupItemsFromServer(lookupType.slug)),
  );

  const groups = LOOKUP_TYPES.map((lookupType, index) => ({
    type: lookupType.slug,
    initialItems: items[index],
  }));

  return <ClassifiersManager groups={groups} />;
}
