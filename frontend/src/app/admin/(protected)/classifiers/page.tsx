import { getLookupItemsFromServer } from "@/lib/api/server";
import { VEHICLE_LOOKUP_TYPES } from "@/config/lookup-types";
import { ClassifiersManager } from "@/components/admin/lookups/ClassifiersManager";

export default async function ClassifiersPage() {
  const items = await Promise.all(
    VEHICLE_LOOKUP_TYPES.map((lookupType) => getLookupItemsFromServer(lookupType.slug)),
  );

  const groups = VEHICLE_LOOKUP_TYPES.map((lookupType, index) => ({
    type: lookupType.slug,
    initialItems: items[index],
  }));

  return <ClassifiersManager title="ტრანსპორტის კლასიფიკატორები" groups={groups} />;
}
