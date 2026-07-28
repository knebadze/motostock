import { getLookupItemsFromServer } from "@/lib/api/server";
import { GENERAL_LOOKUP_TYPES } from "@/config/lookup-types";
import { ClassifiersManager } from "@/components/admin/lookups/ClassifiersManager";

export default async function GeneralClassifiersPage() {
  const items = await Promise.all(
    GENERAL_LOOKUP_TYPES.map((lookupType) => getLookupItemsFromServer(lookupType.slug)),
  );

  const groups = GENERAL_LOOKUP_TYPES.map((lookupType, index) => ({
    type: lookupType.slug,
    initialItems: items[index],
  }));

  return <ClassifiersManager title="საერთო კლასიფიკატორები" groups={groups} />;
}
